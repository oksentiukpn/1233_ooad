import io
import json
from email import message_from_bytes
from unittest.mock import MagicMock

from app.reports.lambda_handler import (
    detect_trigger_and_payload,
)
from app.reports.lambda_handler import (
    handler as builder_handler,
)
from app.reports.mailer_handler import (
    extract_week_from_key,
)
from app.reports.mailer_handler import (
    handler as mailer_handler,
)


def test_detect_trigger_and_payload():
    # SQS trigger
    sqs_event = {
        "Records": [
            {
                "eventSource": "aws:sqs",
                "body": json.dumps({"week": "2026-W39", "source": "manual"}),
            }
        ]
    }
    trigger, payload = detect_trigger_and_payload(sqs_event)
    assert trigger == "sqs"
    assert payload["week"] == "2026-W39"

    # Schedule trigger via SQS
    sqs_schedule_event = {
        "Records": [
            {
                "eventSource": "aws:sqs",
                "body": json.dumps({"week": None, "source": "schedule"}),
            }
        ]
    }
    trigger, payload = detect_trigger_and_payload(sqs_schedule_event)
    assert trigger == "sqs"
    assert payload["source"] == "schedule"

    # Direct Schedule trigger
    direct_schedule_event = {"source": "schedule"}
    trigger, payload = detect_trigger_and_payload(direct_schedule_event)
    assert trigger == "schedule"

    # Manual direct trigger
    manual_event = {"week": "2026-W40", "source": "manual"}
    trigger, payload = detect_trigger_and_payload(manual_event)
    assert trigger == "manual"
    assert payload["week"] == "2026-W40"


def test_extract_week_from_key():
    assert extract_week_from_key("reports/2026-W40.csv") == "2026-W40"
    assert extract_week_from_key("reports/sub/2026-W01.csv") == "2026-W01"
    assert extract_week_from_key("some/other/file.csv") == "file"


def test_builder_handler_with_mocked_s3(monkeypatch, db_session):
    # Mock boto3 s3 client
    mock_s3 = MagicMock()
    monkeypatch.setattr(
        "app.reports.lambda_handler.boto3.client", lambda service: mock_s3
    )

    sqs_event = {
        "Records": [
            {
                "eventSource": "aws:sqs",
                "body": json.dumps({"week": "2026-W40", "source": "manual"}),
            }
        ]
    }

    res = builder_handler(sqs_event, None, db=db_session)
    assert res["status"] == "success"
    assert res["trigger"] == "sqs"
    assert res["week"] == "2026-W40"
    assert res["key"] == "reports/2026-W40.csv"

    # Verify put_object was called
    mock_s3.put_object.assert_called_once()
    call_kwargs = mock_s3.put_object.call_args.kwargs
    assert call_kwargs["Key"] == "reports/2026-W40.csv"
    assert call_kwargs["ContentType"] == "text/csv"
    assert b"EXECUTIVE_WEEKLY_SUMMARY" in call_kwargs["Body"]


def test_mailer_handler_with_mocked_s3_and_ses(monkeypatch):
    csv_sample = b"SECTION,EXECUTIVE_WEEKLY_SUMMARY\nMETRIC,CURRENT_WEEK (2026-W40)\n"

    # Mock s3
    mock_s3 = MagicMock()
    mock_s3.get_object.return_value = {"Body": io.BytesIO(csv_sample)}

    # Mock sesv2
    mock_ses = MagicMock()
    mock_ses.send_email.return_value = {"MessageId": "msg-12345-test"}

    def fake_boto_client(service, **kwargs):
        if service == "s3":
            return mock_s3
        if service == "sesv2":
            return mock_ses
        raise ValueError(f"Unexpected service {service}")

    monkeypatch.setattr("app.reports.mailer_handler.boto3.client", fake_boto_client)

    s3_event = {
        "Records": [
            {
                "eventName": "ObjectCreated:Put",
                "s3": {
                    "bucket": {"name": "spry-reports-test"},
                    "object": {"key": "reports/2026-W40.csv"},
                },
            }
        ]
    }

    res = mailer_handler(s3_event, None)
    assert res["status"] == "success"
    assert res["trigger"] == "s3"
    assert res["week"] == "2026-W40"
    assert res["message_id"] == "msg-12345-test"

    # Verify get_object
    mock_s3.get_object.assert_called_once_with(
        Bucket="spry-reports-test", Key="reports/2026-W40.csv"
    )

    # Verify ses send_email
    mock_ses.send_email.assert_called_once()
    ses_kwargs = mock_ses.send_email.call_args.kwargs
    assert "Raw" in ses_kwargs["Content"]
    raw_data = ses_kwargs["Content"]["Raw"]["Data"]

    parsed_email = message_from_bytes(raw_data)
    assert "Weekly Meetings Report: 2026-W40" in parsed_email["Subject"]

    # Check attachments
    attachments = [p for p in parsed_email.walk() if p.get_filename()]
    assert len(attachments) == 1
    assert attachments[0].get_filename() == "report-2026-W40.csv"
    assert attachments[0].get_content_type() == "text/csv"
    assert b"EXECUTIVE_WEEKLY_SUMMARY" in attachments[0].get_payload(decode=True)
