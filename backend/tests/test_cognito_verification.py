import json
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from jwt.algorithms import RSAAlgorithm

import app.core.security as security
from app.core.config import settings


@pytest.fixture(scope="module")
def rsa_keypair():
    # Generate RSA private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    public_key = private_key.public_key()

    # Export JWK
    jwk_dict = json.loads(RSAAlgorithm.to_jwk(public_key))
    jwk_dict["kid"] = "test-key-id-1"
    jwk_dict["alg"] = "RS256"
    jwk_dict["use"] = "sig"

    return {
        "private_key": private_key,
        "public_key": public_key,
        "jwk": jwk_dict,
        "kid": "test-key-id-1",
    }


def make_token(rsa_keypair, payload_overrides=None, headers_overrides=None):
    now = int(time.time())
    payload = {
        "sub": "user-uuid-123",
        "iss": settings.cognito_iss,
        "client_id": settings.COGNITO_CLIENT_ID,
        "exp": now + 3600,
        "iat": now,
        "token_use": "access",
    }
    if payload_overrides:
        payload.update(payload_overrides)

    headers = {"kid": rsa_keypair["kid"]}
    if headers_overrides:
        headers.update(headers_overrides)

    return jwt.encode(
        payload,
        rsa_keypair["private_key"],
        algorithm="RS256",
        headers=headers,
    )


def test_verify_cognito_token_success(rsa_keypair, monkeypatch):
    # Mock JWKS cache
    security._JWKS_CACHE = {"keys": [rsa_keypair["jwk"]]}
    security._JWKS_LAST_FETCH = time.time()

    token = make_token(rsa_keypair)
    claims = security.verify_cognito_token(token)
    assert claims["sub"] == "user-uuid-123"
    assert claims["client_id"] == settings.COGNITO_CLIENT_ID
    assert claims["iss"] == settings.cognito_iss


def test_verify_cognito_token_missing_bearer():
    with pytest.raises(HTTPException) as exc_info:
        security.verify_cognito_token("")
    assert exc_info.value.status_code == 401
    assert "Missing bearer token" in exc_info.value.detail


def test_verify_cognito_token_invalid_header():
    with pytest.raises(HTTPException) as exc_info:
        security.verify_cognito_token("not-a-valid-jwt")
    assert exc_info.value.status_code == 401


def test_verify_cognito_token_missing_kid(rsa_keypair):
    token = jwt.encode(
        {"sub": "123"},
        rsa_keypair["private_key"],
        algorithm="RS256",
        headers={},  # no kid
    )
    with pytest.raises(HTTPException) as exc_info:
        security.verify_cognito_token(token)
    assert exc_info.value.status_code == 401
    assert "missing key ID (kid)" in exc_info.value.detail


def test_verify_cognito_token_expired(rsa_keypair):
    security._JWKS_CACHE = {"keys": [rsa_keypair["jwk"]]}
    security._JWKS_LAST_FETCH = time.time()

    token = make_token(rsa_keypair, payload_overrides={"exp": int(time.time()) - 100})
    with pytest.raises(HTTPException) as exc_info:
        security.verify_cognito_token(token)
    assert exc_info.value.status_code == 401
    assert "Token has expired" in exc_info.value.detail


def test_verify_cognito_token_invalid_issuer(rsa_keypair):
    security._JWKS_CACHE = {"keys": [rsa_keypair["jwk"]]}
    security._JWKS_LAST_FETCH = time.time()

    token = make_token(
        rsa_keypair, payload_overrides={"iss": "https://attacker.com/auth"}
    )
    with pytest.raises(HTTPException) as exc_info:
        security.verify_cognito_token(token)
    assert exc_info.value.status_code == 401
    assert "Invalid token issuer" in exc_info.value.detail


def test_verify_cognito_token_invalid_client_id(rsa_keypair):
    security._JWKS_CACHE = {"keys": [rsa_keypair["jwk"]]}
    security._JWKS_LAST_FETCH = time.time()

    token = make_token(rsa_keypair, payload_overrides={"client_id": "wrong-client-id"})
    with pytest.raises(HTTPException) as exc_info:
        security.verify_cognito_token(token)
    assert exc_info.value.status_code == 401
    assert "Invalid client_id claim" in exc_info.value.detail


def test_verify_cognito_id_token_aud_fallback(rsa_keypair):
    # ID tokens use 'aud' instead of 'client_id'
    security._JWKS_CACHE = {"keys": [rsa_keypair["jwk"]]}
    security._JWKS_LAST_FETCH = time.time()

    token = make_token(
        rsa_keypair,
        payload_overrides={
            "client_id": None,
            "aud": settings.COGNITO_CLIENT_ID,
            "token_use": "id",
        },
    )
    claims = security.verify_cognito_token(token)
    assert claims["aud"] == settings.COGNITO_CLIENT_ID


def test_jwks_caching(rsa_keypair, monkeypatch):
    # Verify that get_jwks caches keys and doesn't fetch repeatedly
    fetch_count = 0

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"keys": [rsa_keypair["jwk"]]}

    class FakeHttpxClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def get(self, url):
            nonlocal fetch_count
            fetch_count += 1
            return FakeResponse()

    monkeypatch.setattr(security.httpx, "Client", FakeHttpxClient)
    security._JWKS_CACHE = {}
    security._JWKS_LAST_FETCH = 0.0

    # 1st call: fetches
    jwks1 = security.get_jwks()
    assert fetch_count == 1
    assert len(jwks1["keys"]) == 1

    # 2nd call: within TTL, should use cache
    jwks2 = security.get_jwks()
    assert fetch_count == 1
    assert jwks1 == jwks2

    # 3rd call with force_refresh: should fetch again
    jwks3 = security.get_jwks(force_refresh=True)
    assert fetch_count == 2
    assert jwks3 == jwks1


def test_jwks_network_error_fallback(rsa_keypair, monkeypatch):
    class FailingHttpxClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def get(self, url):
            raise OSError(99, "Cannot assign requested address")

    monkeypatch.setattr(security.httpx, "Client", FailingHttpxClient)
    security._JWKS_CACHE = {"keys": [rsa_keypair["jwk"]]}
    security._JWKS_LAST_FETCH = 0.0  # Force it to attempt refresh

    # Should not raise 500, should gracefully return cached/fallback keys
    jwks = security.get_jwks(force_refresh=True)
    assert jwks == {"keys": [rsa_keypair["jwk"]]}
