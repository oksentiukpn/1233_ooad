from datetime import datetime, timezone

from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "spry-backend"
    assert data["status"] == "operational"


def test_create_and_get_meeting(client: TestClient):
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


def test_create_meeting_validation_error(client: TestClient):
    # Missing required starts_at and ends_at
    invalid_payload = {
        "title": "Некоректне засідання",
    }
    res = client.post("/api/meetings", json=invalid_payload)
    assert res.status_code == 422
