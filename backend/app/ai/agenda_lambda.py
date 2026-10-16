import json
import logging
import time
from datetime import date
from typing import Any, Dict

from app.ai.agenda import (
    PROMPT_VERSION,
    AgendaParseError,
    cost_usd,
    parse_agenda,
)
from app.core.config import settings
from app.core.security import verify_cognito_token

logger = logging.getLogger("agenda-lambda")
logger.setLevel(logging.INFO)

# Notice: AWS Lambda Function URL has built-in CORS configuration in Terraform.
# Do NOT return duplicate Access-Control-Allow-Origin headers here, as duplicate
# CORS headers cause browsers (Firefox/Chrome) to block requests with NetworkError.
RESPONSE_HEADERS = {
    "Content-Type": "application/json",
}


def _extract_auth_token(headers: Dict[str, Any]) -> str:
    """Extract bearer token from case-insensitive headers."""
    auth_header = ""
    for k, v in headers.items():
        if k.lower() == "authorization":
            auth_header = str(v)
            break

    if not auth_header:
        return ""

    parts = auth_header.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return auth_header.strip()


def handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """Lambda Function URL handler for Agenda Parsing with Amazon Bedrock.

    - Outside VPC (direct Bedrock access with zero VPC endpoint cost).
    - Checks Cognito Bearer JWT (401 if missing/invalid).
    - Checks input text length <= 10,000 chars (413 if exceeded).
    - Structured JSON logging: user, model, prompt_version, tokens, cost.
    """
    # 1. Handle HTTP OPTIONS preflight if forwarded
    http_method = event.get("requestContext", {}).get("http", {}).get("method")
    if not http_method:
        http_method = event.get("httpMethod", "POST")

    if http_method.upper() == "OPTIONS":
        return {
            "statusCode": 204,
            "headers": RESPONSE_HEADERS,
            "body": "",
        }

    headers = event.get("headers", {}) or {}

    # 2. Authenticate user via Cognito JWT
    token = _extract_auth_token(headers)
    if not token:
        logger.warning("Unauthorized request: missing Authorization header")
        return {
            "statusCode": 401,
            "headers": RESPONSE_HEADERS,
            "body": json.dumps({"detail": "Missing bearer token"}),
        }

    try:
        user_payload = verify_cognito_token(token)
        user_sub = user_payload.get("sub", "unknown")
    except Exception as e:
        logger.warning(f"Unauthorized request: invalid Cognito token: {e}")
        return {
            "statusCode": 401,
            "headers": RESPONSE_HEADERS,
            "body": json.dumps({"detail": f"Unauthorized: {str(e)}"}),
        }

    # 3. Parse and validate JSON request body
    body_raw = event.get("body", "{}")
    if event.get("isBase64Encoded", False):
        import base64

        body_raw = base64.b64decode(body_raw).decode("utf-8")

    try:
        body = json.loads(body_raw) if isinstance(body_raw, str) else (body_raw or {})
    except Exception as e:
        return {
            "statusCode": 400,
            "headers": RESPONSE_HEADERS,
            "body": json.dumps({"detail": f"Invalid JSON body: {str(e)}"}),
        }

    text = body.get("text", "")
    if not text or not str(text).strip():
        return {
            "statusCode": 422,
            "headers": RESPONSE_HEADERS,
            "body": json.dumps({
                "detail": "The 'text' field is required and cannot be empty."
            }),
        }

    # 4. Enforce input length quota before calling LLM
    if len(text) > 10_000:
        return {
            "statusCode": 413,
            "headers": RESPONSE_HEADERS,
            "body": json.dumps({
                "detail": "Text exceeds maximum allowed length of 10,000 characters."
            }),
        }

    # 5. Extract today and tz (defaults to current date and Europe/Kyiv)
    today_str = body.get("today")
    try:
        ref_date = date.fromisoformat(today_str) if today_str else date.today()
    except Exception:
        ref_date = date.today()

    tz = body.get("tz", "Europe/Kyiv")

    # 6. Execute inference and time latency
    started = time.monotonic()
    active_model = settings.PARSER_MODEL

    try:
        agenda, usage = parse_agenda(
            text=text,
            today=ref_date,
            tz=tz,
            model_id=active_model,
        )
    except AgendaParseError as err:
        logger.warning(f"AgendaParseError for user {user_sub}: {err}")
        return {
            "statusCode": 422,
            "headers": RESPONSE_HEADERS,
            "body": json.dumps({"detail": str(err)}),
        }
    except Exception as err:
        logger.error(f"Internal error invoking Bedrock parser: {err}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": RESPONSE_HEADERS,
            "body": json.dumps({
                "detail": f"Failed to parse agenda with LLM: {str(err)}"
            }),
        }

    latency_ms = int((time.monotonic() - started) * 1000)
    calculated_cost = cost_usd(active_model, usage)

    # 7. One structured CloudWatch log line per parse
    log_record = {
        "event": "agenda_parsed",
        "user": user_sub,
        "model": active_model,
        "prompt_version": PROMPT_VERSION,
        "input_tokens": usage.get("input_tokens", 0),
        "output_tokens": usage.get("output_tokens", 0),
        "latency_ms": latency_ms,
        "cost_usd": calculated_cost,
    }
    logger.info(json.dumps(log_record))

    # 8. Return 200 with suggested agenda
    return {
        "statusCode": 200,
        "headers": RESPONSE_HEADERS,
        "body": json.dumps({
            "agenda": agenda.model_dump(mode="json"),
            "model": active_model,
            "prompt_version": PROMPT_VERSION,
            "usage": usage,
            "latency_ms": latency_ms,
            "cost_usd": calculated_cost,
        }),
    }
