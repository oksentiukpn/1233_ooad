import logging
import os
import re
import urllib.parse
from email.message import EmailMessage
from typing import Any, Dict, List

import boto3

# Configure logger
logger = logging.getLogger("report-mailer")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

WEEK_REGEX = re.compile(r"reports/(\d{4}-W\d{2})\.csv")


def extract_week_from_key(key: str) -> str:
    """Extract ISO week from object key 'reports/YYYY-Www.csv'."""
    match = WEEK_REGEX.search(key)
    if match:
        return match.group(1)
    return os.path.splitext(os.path.basename(key))[0]


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """Lambda handler for report-mailer (outside VPC).

    Triggered by S3 ObjectCreated events on reports/*.csv.
    Reads file, constructs MIME email with CSV attachment, sends through SES.
    NOTE: NEVER writes to reports/ prefix to avoid recursive invocations.
    """
    if not isinstance(event, dict) or "Records" not in event or not event["Records"]:
        logger.warning("report-mailer invoked without S3 Records in event")
        return {"status": "ignored", "reason": "no_records"}

    first_record = event["Records"][0]
    s3_info = first_record.get("s3", {})
    bucket = s3_info.get("bucket", {}).get("name")
    raw_key = s3_info.get("object", {}).get("key", "")
    key = urllib.parse.unquote_plus(raw_key)

    if not bucket or not key:
        logger.error(f"Missing bucket or key in event: {s3_info}")
        return {"status": "error", "reason": "missing_bucket_or_key"}

    week = extract_week_from_key(key)

    # Required CloudWatch log line: shows event and trigger starting the function
    logger.info(
        f"report-mailer triggered: trigger=s3, bucket={bucket}, key={key}, week={week}",
        extra={"trigger": "s3", "bucket": bucket, "key": key, "week": week},
    )

    # Download report CSV from S3
    logger.info(f"Downloading report from s3://{bucket}/{key}...")
    s3_client = boto3.client("s3")
    resp = s3_client.get_object(Bucket=bucket, Key=key)
    csv_bytes = resp["Body"].read()
    logger.info(f"Downloaded {len(csv_bytes)} bytes from S3.")

    # Prepare recipient and sender
    sender = os.environ.get("REPORT_SENDER_EMAIL", "reports@1233.pp.ua")
    raw_recipients = os.environ.get("REPORT_RECIPIENT_EMAIL", "oksentiuk.pn@ucu.edu.ua")
    recipients: List[str] = [r.strip() for r in raw_recipients.split(",") if r.strip()]

    # Build MIME message with attachment
    msg = EmailMessage()
    msg["Subject"] = f"Weekly Meetings Report: {week} (Spry Monorepo)"
    msg["From"] = sender
    msg["To"] = ", ".join(recipients)

    body_text = (
        f"Вітаємо!\n\n"
        f"Автоматичний щотижневий звіт засідань Верховної Ради України "
        f"за тиждень {week} успішно сформовано.\n\n"
        f"Звіт додано у вкладенні (CSV-файл).\n\n"
        f"--\n"
        f"Система обліку засідань Spry (1233.pp.ua)\n"
        f"Amazon SES Event-Driven Reporting Service"
    )
    msg.set_content(body_text)

    # Add CSV attachment
    filename = f"report-{week}.csv"
    msg.add_attachment(
        csv_bytes,
        maintype="text",
        subtype="csv",
        filename=filename,
    )

    # Send email via Amazon SESv2
    region = os.environ.get("AWS_REGION", "us-east-1")
    logger.info(
        f"Sending email from {sender} to {recipients} via Amazon SES ({region})..."
    )
    ses_client = boto3.client("sesv2", region_name=region)
    ses_response = ses_client.send_email(
        FromEmailAddress=sender,
        Destination={"ToAddresses": recipients},
        Content={"Raw": {"Data": msg.as_bytes()}},
    )
    message_id = ses_response.get("MessageId", "unknown")
    logger.info(f"Email sent successfully through SES. MessageId: {message_id}")

    return {
        "status": "success",
        "trigger": "s3",
        "week": week,
        "bucket": bucket,
        "key": key,
        "message_id": message_id,
        "recipients": recipients,
    }
