from unittest.mock import MagicMock, patch

from app.lambda_handler import handler


def test_lambda_handler_migration():
    with patch("alembic.command.upgrade") as mock_upgrade:
        res = handler({"action": "migrate"}, MagicMock())
        assert res["status"] == "success"
        assert "Alembic migrations applied" in res["message"]
        mock_upgrade.assert_called_once()


def test_lambda_handler_http_request():
    event = {
        "version": "2.0",
        "routeKey": "GET /",
        "rawPath": "/",
        "rawQueryString": "",
        "headers": {"host": "test.lambda-url.us-east-1.on.aws"},
        "requestContext": {
            "http": {
                "method": "GET",
                "path": "/",
                "protocol": "HTTP/1.1",
                "sourceIp": "127.0.0.1",
                "userAgent": "pytest",
            }
        },
        "isBase64Encoded": False,
    }
    res = handler(event, MagicMock())
    assert res["statusCode"] == 200
    assert "spry-backend" in res["body"]
