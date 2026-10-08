from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.core.security import require_cognito_auth
from app.main import app


def test_root_endpoint(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "spry-backend"
    assert data["status"] == "operational"


def test_meetings_unauthenticated(client: TestClient):
    # Calling without Authorization header must return 401
    res_get = client.get("/api/meetings")
    assert res_get.status_code == 401
    assert "Authorization header" in res_get.json().get("detail", "")

    res_post = client.post(
        "/api/meetings",
        json={
            "title": "Test",
            "starts_at": "2026-10-08T12:00:00Z",
            "ends_at": "2026-10-08T13:00:00Z",
        },
    )
    assert res_post.status_code == 401


def test_create_and_get_meeting_authenticated(client: TestClient):
    # Override Cognito auth to simulate a verified user
    app.dependency_overrides[require_cognito_auth] = lambda: {
        "sub": "test-user-id",
        "client_id": "test-client-id",
        "username": "google_12345",
    }
    try:
        # Test GET empty meetings list
        get_res = client.get("/api/meetings")
        assert get_res.status_code == 200
        assert get_res.json() == []

        # Test POST create meeting
        payload = {
            "title": "Пленарне засідання № 1",
            "starts_at": datetime.now(timezone.utc).isoformat(),
            "ends_at": datetime.now(timezone.utc).isoformat(),
            "attendee_count": 450,
            "cost_estimate_usd": 120.50,
        }
        post_res = client.post("/api/meetings", json=payload)
        assert post_res.status_code == 201
        created = post_res.json()
        assert created["title"] == "Пленарне засідання № 1"
        assert created["attendee_count"] == 450
        assert "id" in created

        # Test GET meetings returns created meeting
        get_res2 = client.get("/api/meetings")
        assert get_res2.status_code == 200
        meetings = get_res2.json()
        assert len(meetings) == 1
        assert meetings[0]["id"] == created["id"]
    finally:
        app.dependency_overrides.pop(require_cognito_auth, None)


def test_create_meeting_validation_error(client: TestClient):
    app.dependency_overrides[require_cognito_auth] = lambda: {"sub": "test-user-id"}
    try:
        # Missing required starts_at and ends_at
        invalid_payload = {
            "title": "Некоректне засідання",
        }
        res = client.post("/api/meetings", json=invalid_payload)
        assert res.status_code == 422
    finally:
        app.dependency_overrides.pop(require_cognito_auth, None)
