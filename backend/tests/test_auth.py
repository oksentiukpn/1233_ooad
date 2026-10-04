from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.user import User


def test_google_login_redirect(client: TestClient, monkeypatch):
    monkeypatch.setattr(
        "app.core.config.settings.OAUTH_CLIENT_ID",
        "test-google-client-id.apps.googleusercontent.com",
    )
    response = client.get("/api/auth/google/login", follow_redirects=False)
    assert response.status_code == 302
    location = response.headers.get("location", "")
    assert "accounts.google.com" in location
    assert "client_id=" in location
    assert "response_type=code" in location


def test_google_login_missing_client_id(client: TestClient, monkeypatch):
    monkeypatch.setattr("app.core.config.settings.OAUTH_CLIENT_ID", "")
    monkeypatch.setattr("app.core.config.settings.GOOGLE_CLIENT_ID", "")
    response = client.get("/api/auth/google/login", follow_redirects=False)
    assert response.status_code == 500
    assert "Google OAuth Client ID не налаштовано" in response.json()["detail"]


def test_auth_me_unauthorized(client: TestClient):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Необхідна авторизація"


def test_auth_check_unauthenticated(client: TestClient):
    response = client.get("/api/auth/check")
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is False
    assert data["user"] is None


def test_auth_me_with_bearer_token(client: TestClient, db_session: Session):
    user = User(
        google_id="google-test-12345",
        email="deputy@rada.gov.ua",
        name="Народний Депутат",
        avatar_url="https://example.com/avatar.jpg",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(subject=user.id)

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "deputy@rada.gov.ua"
    assert data["name"] == "Народний Депутат"
    assert data["id"] == user.id


def test_auth_check_with_cookie(client: TestClient, db_session: Session):
    user = User(
        google_id="google-cookie-789",
        email="test_cookie@rada.gov.ua",
        name="Тестовий Користувач",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(subject=user.id)
    client.cookies.set("access_token", token)

    response = client.get("/api/auth/check")
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert data["user"]["email"] == "test_cookie@rada.gov.ua"


def test_logout(client: TestClient):
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    # Cookie is invalidated (max-age=0 or expires in past)
    set_cookie = response.headers.get("set-cookie", "")
    assert "access_token" in set_cookie
