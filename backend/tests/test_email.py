from unittest.mock import patch

from fastapi.testclient import TestClient

from app.services.email import send_email, send_welcome_email


def test_send_email_dry_run_when_no_api_key(monkeypatch):
    monkeypatch.setattr("app.core.config.settings.RESEND_API_KEY", "")
    res = send_email(to="test@example.com", subject="Test", html="<p>Test</p>")
    assert res["status"] == "dry_run"
    assert "RESEND_API_KEY is not configured" in res["message"]


@patch("resend.Emails.send")
def test_send_email_success(mock_send, monkeypatch):
    monkeypatch.setattr("app.core.config.settings.RESEND_API_KEY", "re_test_key_12345")
    mock_send.return_value = {"id": "email_12345"}

    res = send_email(
        to="deputy@rada.gov.ua",
        subject="Засідання комітету",
        html="<b>Повідомлення</b>",
    )
    assert res["id"] == "email_12345"
    mock_send.assert_called_once()


@patch("resend.Emails.send")
def test_send_welcome_email(mock_send, monkeypatch):
    monkeypatch.setattr("app.core.config.settings.RESEND_API_KEY", "re_test_key_12345")
    mock_send.return_value = {"id": "welcome_email_999"}

    res = send_welcome_email(
        user_email="new_user@rada.gov.ua",
        user_name="Іван Петренко",
    )
    assert res["id"] == "welcome_email_999"


def test_notifications_send_endpoint(client: TestClient):
    payload = {
        "to": "test@rada.gov.ua",
        "subject": "Тестове сповіщення",
        "content": "Це перевірка інтеграції Resend",
    }
    response = client.post("/api/notifications/send", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "queued"
