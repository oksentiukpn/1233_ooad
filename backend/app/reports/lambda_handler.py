import json
import logging
import os
from typing import Any, Dict, Optional, Tuple

import boto3
from sqlalchemy.orm import Session

from app.reports.weekly import build_weekly_report, get_previous_iso_week

# Configure logger
logger = logging.getLogger("report-builder")
if not logger.handlers:
    handler_obj = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
    )
    handler_obj.setFormatter(formatter)
    logger.addHandler(handler_obj)
logger.setLevel(logging.INFO)


def detect_trigger_and_payload(event: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    """Inspect the incoming Lambda event and return (trigger_name, payload_dict).

    Triggers:
    - 'sqs': SQS event source mapping (event['Records'][0]['eventSource'] == 'aws:sqs')
    - 'schedule': EventBridge Scheduler event (source == 'schedule' or detail-type)
    - 'manual': Direct invocation with source='manual' or any explicit payload
    """
    if not isinstance(event, dict):
        return "manual", {}

    # Check SQS event
    if "Records" in event and isinstance(event["Records"], list) and event["Records"]:
        first_record = event["Records"][0]
        if first_record.get("eventSource") == "aws:sqs":
            body_str = first_record.get("body", "{}")
            try:
                body = json.loads(body_str)
                # If the body specifies its own source, e.g. schedule sent via SQS
                if isinstance(body, dict) and body.get("source") == "schedule":
                    # It came from schedule via SQS queue
                    return "sqs", body
                return "sqs", body if isinstance(body, dict) else {}
            except Exception:
                return "sqs", {"raw_body": body_str}

    # Check direct EventBridge Scheduler invocation
    if (
        event.get("source") == "schedule"
        or event.get("detail-type") == "Scheduled Event"
    ):
        return "schedule", event

    source = event.get("source")
    if source:
        return str(source), event

    return "manual", event


def handler(
    event: Dict[str, Any], context: Any, db: Optional[Session] = None
) -> Dict[str, Any]:
    """Lambda handler for report-builder.

    Triggered by:
    1. SQS message (via EventBridge Scheduler or 'make report-now')
    2. Direct EventBridge Scheduler invocation
    3. Manual invocation
    """
    trigger, payload = detect_trigger_and_payload(event)

    # Determine ISO week
    week = payload.get("week") if isinstance(payload, dict) else None
    if not week:
        week = get_previous_iso_week()

    # Required CloudWatch log line: shows event and trigger starting the function
    logger.info(
        f"report-builder triggered: trigger={trigger}, week={week}",
        extra={"trigger": trigger, "week": week},
    )

    # Generate CSV bytes
    logger.info(f"Generating weekly report for week={week}...")
    csv_bytes = build_weekly_report(week, db=db)

    # Resolve S3 bucket
    bucket = os.environ.get("REPORTS_BUCKET", "spry-reports-791614297907")
    key = f"reports/{week}.csv"

    # Upload to S3
    logger.info(f"Uploading report to s3://{bucket}/{key} ({len(csv_bytes)} bytes)...")
    s3_client = boto3.client("s3")
    s3_client.put_object(
        Bucket=bucket,
        Key=key,
        Body=csv_bytes,
        ContentType="text/csv",
    )
    logger.info(f"Report successfully uploaded to s3://{bucket}/{key}")

    return {
        "status": "success",
        "trigger": trigger,
        "week": week,
        "bucket": bucket,
        "key": key,
        "size_bytes": len(csv_bytes),
    }
