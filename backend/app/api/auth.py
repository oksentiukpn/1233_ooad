import json
import logging
import urllib.parse
from typing import Optional

import httpx
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
    status,
)
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_current_user,
    get_current_user_optional,
)
from app.models.user import User
from app.schemas.user import TokenResponse, UserRead
from app.services.email import send_welcome_email

logger = logging.getLogger(__name__)

router = APIRouter()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


def _resolve_redirect_uri(request: Request, override_uri: Optional[str] = None) -> str:
    if override_uri:
        return override_uri

    host = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("host")
        or request.url.netloc
    )
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme

    # Always use production domain for 1233.pp.ua or App Runner hosts
    if "1233.pp.ua" in host or "awsapprunner.com" in host:
        return "https://1233.pp.ua/api/auth/google/callback"

    # Default local / current host
    return f"{proto}://{host}/api/auth/google/callback"


class GoogleTokenAuthRequest(BaseModel):
    credential: Optional[str] = None
    code: Optional[str] = None
    redirect_uri: Optional[str] = None


@router.get("/google/login", summary="Redirect to Google OAuth consent screen")
def google_login(
    request: Request,
    redirect_uri: Optional[str] = None,
    return_to: str = "/",
):
    client_id = settings.effective_google_client_id
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth Client ID не налаштовано в системі.",
        )

    resolved_redirect_uri = _resolve_redirect_uri(request, redirect_uri)

    state_data = json.dumps(
        {"return_to": return_to, "redirect_uri": resolved_redirect_uri}
    )
    params = {
        "client_id": client_id,
        "redirect_uri": resolved_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state_data,
    }

    url = f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)


@router.get("/google/callback", summary="Google OAuth callback handler")
async def google_callback(
    request: Request,
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
):
    return_to = "/"
    target_redirect_uri = _resolve_redirect_uri(request)

    if state:
        try:
            parsed_state = json.loads(state)
            if isinstance(parsed_state, dict):
                return_to = parsed_state.get("return_to", "/")
                target_redirect_uri = parsed_state.get(
                    "redirect_uri", target_redirect_uri
                )
        except Exception:
            pass

    if error:
        logger.warning(f"Google OAuth error returned: {error}")
        return RedirectResponse(
            url=f"{return_to}?auth_error={urllib.parse.quote(error)}",
            status_code=status.HTTP_302_FOUND,
        )

    if not code:
        return RedirectResponse(
            url=f"{return_to}?auth_error=missing_code",
            status_code=status.HTTP_302_FOUND,
        )

    client_id = settings.effective_google_client_id
    client_secret = settings.effective_google_client_secret

    if not client_id or not client_secret:
        return RedirectResponse(
            url=f"{return_to}?auth_error=oauth_not_configured",
            status_code=status.HTTP_302_FOUND,
        )

    # 1. Exchange code for tokens
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_res = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": target_redirect_uri,
                "grant_type": "authorization_code",
            },
        )

        if token_res.status_code != 200:
            logger.error(f"Failed to exchange Google OAuth code: {token_res.text}")
            return RedirectResponse(
                url=f"{return_to}?auth_error=token_exchange_failed",
                status_code=status.HTTP_302_FOUND,
            )

        token_data = token_res.json()
        google_access_token = token_data.get("access_token")

        # 2. Fetch user profile
        userinfo_res = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {google_access_token}"},
        )
        if userinfo_res.status_code != 200:
            logger.error(f"Failed to fetch Google userinfo: {userinfo_res.text}")
            return RedirectResponse(
                url=f"{return_to}?auth_error=userinfo_failed",
                status_code=status.HTTP_302_FOUND,
            )

        userinfo = userinfo_res.json()

    google_id = userinfo.get("sub")
    email = userinfo.get("email")
    name = userinfo.get("name")
    picture = userinfo.get("picture")

    if not google_id or not email:
        return RedirectResponse(
            url=f"{return_to}?auth_error=invalid_user_data",
            status_code=status.HTTP_302_FOUND,
        )

    # 3. Find or create user in DB
    user = db.scalar(
        select(User).where((User.google_id == google_id) | (User.email == email))
    )
    is_new = False
    if user:
        user.google_id = google_id
        if name:
            user.name = name
        if picture:
            user.avatar_url = picture
    else:
        is_new = True
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            avatar_url=picture,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    if is_new and background_tasks:
        background_tasks.add_task(
            send_welcome_email, user_email=user.email, user_name=user.name
        )

    # 4. Generate application JWT
    jwt_token = create_access_token(
        subject=user.id,
        extra_claims={"email": user.email, "name": user.name},
    )

    # 5. Set HttpOnly Cookie & redirect
    is_secure = "https" in request.headers.get(
        "x-forwarded-proto", request.url.scheme
    ) or "1233.pp.ua" in request.headers.get("host", "")

    redirect_target = f"{return_to}?auth=success"
    response = RedirectResponse(url=redirect_target, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=is_secure,
        path="/",
    )
    return response


@router.post(
    "/google/verify",
    response_model=TokenResponse,
    summary="Verify Google ID token or code from frontend",
)
async def verify_google_credential(
    payload: GoogleTokenAuthRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    userinfo = None

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Case A: Google ID Token (from One-Tap or Google Identity Services SDK)
        if payload.credential:
            info_res = await client.get(
                GOOGLE_TOKENINFO_URL,
                params={"id_token": payload.credential},
            )
            if info_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Невалідний Google ID Token",
                )
            token_info = info_res.json()
            client_id = settings.effective_google_client_id
            if client_id and token_info.get("aud") != client_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Token audience не співпадає з Google Client ID",
                )
            userinfo = token_info

        # Case B: Code exchange
        elif payload.code:
            redirect_uri = _resolve_redirect_uri(request, payload.redirect_uri)
            token_res = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": payload.code,
                    "client_id": settings.effective_google_client_id,
                    "client_secret": settings.effective_google_client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            if token_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Помилка обміну коду Google",
                )
            token_data = token_res.json()
            userinfo_res = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {token_data.get('access_token')}"},
            )
            if userinfo_res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Не вдалося отримати профіль користувача Google",
                )
            userinfo = userinfo_res.json()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Потрібно передати credential або code",
            )

    google_id = userinfo.get("sub")
    email = userinfo.get("email")
    name = userinfo.get("name")
    picture = userinfo.get("picture")

    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google не надав необхідні дані (sub, email)",
        )

    user = db.scalar(
        select(User).where((User.google_id == google_id) | (User.email == email))
    )
    if user:
        user.google_id = google_id
        if name:
            user.name = name
        if picture:
            user.avatar_url = picture
    else:
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            avatar_url=picture,
        )
        db.add(user)

    db.commit()
    db.refresh(user)

    jwt_token = create_access_token(
        subject=user.id,
        extra_claims={"email": user.email, "name": user.name},
    )

    is_secure = "https" in request.headers.get(
        "x-forwarded-proto", request.url.scheme
    ) or "1233.pp.ua" in request.headers.get("host", "")
    response.set_cookie(
        key="access_token",
        value=jwt_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        samesite="lax",
        secure=is_secure,
        path="/",
    )

    return TokenResponse(access_token=jwt_token, token_type="bearer", user=user)


@router.get("/me", response_model=UserRead, summary="Get currently authenticated user")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.get("/check", summary="Check authentication status without 401 error")
def check_auth_status(
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    if not current_user:
        return {"authenticated": False, "user": None}
    return {
        "authenticated": True,
        "user": UserRead.model_validate(current_user),
    }


@router.post("/logout", summary="Logout user and clear session cookie")
def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"message": "Успішно вийшли із системи"}
