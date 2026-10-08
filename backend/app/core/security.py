import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union

import httpx
import jwt
from fastapi import Depends, HTTPException, Request, status
from jwt.algorithms import RSAAlgorithm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

# ------------------------------------------------------------------------------
# Cognito JWKS In-Memory Cache
# ------------------------------------------------------------------------------
_JWKS_CACHE: Dict[str, Any] = {}
_JWKS_LAST_FETCH: float = 0.0
_JWKS_TTL_SECONDS: float = 3600.0  # Cache keys for 1 hour


def get_jwks(
    jwks_url: Optional[str] = None, force_refresh: bool = False
) -> Dict[str, Any]:
    global _JWKS_CACHE, _JWKS_LAST_FETCH
    url = jwks_url or settings.cognito_jwks_url
    now = time.time()

    if (
        not force_refresh
        and _JWKS_CACHE
        and (now - _JWKS_LAST_FETCH < _JWKS_TTL_SECONDS)
    ):
        return _JWKS_CACHE

    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(url)
            resp.raise_for_status()
            _JWKS_CACHE = resp.json()
            _JWKS_LAST_FETCH = now
            return _JWKS_CACHE
    except Exception as e:
        if _JWKS_CACHE:
            return _JWKS_CACHE
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to retrieve Cognito JWKS: {str(e)}",
        )


def verify_cognito_token(token: str) -> Dict[str, Any]:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        header = jwt.get_unverified_header(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token header: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    kid = header.get("kid")
    if not kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token header missing key ID (kid)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    jwks = get_jwks()
    key_dict = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if not key_dict:
        # Retry with force refresh in case of key rotation
        jwks = get_jwks(force_refresh=True)
        key_dict = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)

    if not key_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unknown signing key ID (kid)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        public_key = RSAAlgorithm.from_jwk(key_dict)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to load public key: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_exp": True, "verify_iss": False, "verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Verify issuer (iss claim)
    expected_iss = settings.cognito_iss
    if payload.get("iss") != expected_iss:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token issuer: expected {expected_iss}, got {payload.get('iss')}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Verify client_id claim (client_id for access token, or aud for id token)
    token_client_id = payload.get("client_id") or payload.get("aud")
    if token_client_id != settings.COGNITO_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid client_id claim: expected {settings.COGNITO_CLIENT_ID}, got {token_client_id}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


def require_cognito_auth(request: Request) -> Dict[str, Any]:
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header with Bearer token is required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_cognito_token(token)


# ------------------------------------------------------------------------------
# Legacy / Local JWT Security Helpers (maintained for backwards compatibility)
# ------------------------------------------------------------------------------
def create_access_token(
    subject: Union[str, int],
    extra_claims: Optional[dict] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if extra_claims:
        to_encode.update(extra_claims)

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except (jwt.PyJWTError, ValueError):
        return None


def get_token_from_request(request: Request) -> Optional[str]:
    # 1. Check Authorization header: Bearer <token>
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token:
            return token

    # 2. Check Cookie: access_token
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token

    return None


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[User]:
    token = get_token_from_request(request)
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload:
        return None

    user_id_raw = payload.get("sub")
    if not user_id_raw:
        return None

    try:
        user_id = int(user_id_raw)
    except ValueError:
        return None

    user = db.get(User, user_id)
    return user


def get_current_user(
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Необхідна авторизація",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user
