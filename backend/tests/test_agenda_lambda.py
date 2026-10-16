import json
from unittest.mock import patch

from app.ai.agenda import ParsedAgenda
from app.ai.agenda_lambda import handler


def test_handler_options_preflight():
    event = {
        "httpMethod": "OPTIONS",
        "headers": {},
    }
    resp = handler(event)
    assert resp["statusCode"] == 204
    assert resp["headers"]["Access-Control-Allow-Methods"] == "POST,OPTIONS"


def test_handler_missing_auth():
    event = {
        "httpMethod": "POST",
        "headers": {},
        "body": json.dumps({"text": "Hello"}),
    }
    resp = handler(event)
    assert resp["statusCode"] == 401
    assert "Missing bearer token" in resp["body"]


def test_handler_invalid_auth():
    event = {
        "httpMethod": "POST",
        "headers": {"Authorization": "Bearer invalid.token.value"},
        "body": json.dumps({"text": "Hello"}),
    }
    with patch(
        "app.ai.agenda_lambda.verify_cognito_token",
        side_effect=Exception("Signature invalid"),
    ):
        resp = handler(event)
    assert resp["statusCode"] == 401
    assert "Unauthorized" in resp["body"]


def test_handler_payload_too_large():
    event = {
        "httpMethod": "POST",
        "headers": {"Authorization": "Bearer valid.token"},
        "body": json.dumps({"text": "A" * 10001}),
    }
    with patch(
        "app.ai.agenda_lambda.verify_cognito_token",
        return_value={"sub": "user_123"},
    ):
        resp = handler(event)
    assert resp["statusCode"] == 413
    assert "10,000 characters" in resp["body"]


def test_handler_empty_text():
    event = {
        "httpMethod": "POST",
        "headers": {"Authorization": "Bearer valid.token"},
        "body": json.dumps({"text": "   "}),
    }
    with patch(
        "app.ai.agenda_lambda.verify_cognito_token",
        return_value={"sub": "user_123"},
    ):
        resp = handler(event)
    assert resp["statusCode"] == 422


def test_handler_success():
    mock_agenda = ParsedAgenda(
        title="Quick Sync",
        items=[{"topic": "Review PRs", "owner": "Taras", "minutes": 10}],
        language="uk",
    )
    mock_usage = {"input_tokens": 100, "output_tokens": 50}

    event = {
        "httpMethod": "POST",
        "headers": {"authorization": "Bearer valid.token"},
        "body": json.dumps({"text": "Sync: Review PRs"}),
    }

    with (
        patch(
            "app.ai.agenda_lambda.verify_cognito_token",
            return_value={"sub": "user_123"},
        ),
        patch(
            "app.ai.agenda_lambda.parse_agenda",
            return_value=(mock_agenda, mock_usage),
        ),
    ):
        resp = handler(event)

    assert resp["statusCode"] == 200
    data = json.loads(resp["body"])
    assert data["agenda"]["title"] == "Quick Sync"
    assert len(data["agenda"]["items"]) == 1
    assert data["cost_usd"] > 0
    assert "latency_ms" in data
