import logging
from typing import Any, Dict, List, Optional, Union

import resend

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(
    to: Union[str, List[str]],
    subject: str,
    html: str,
    text: Optional[str] = None,
) -> Dict[str, Any]:
    """Send an email via the Resend API."""
    if not settings.RESEND_API_KEY:
        logger.warning(
            "RESEND_API_KEY is not configured. Email will not be sent. "
            f"Target: {to}, Subject: '{subject}'"
        )
        return {
            "id": "mock-resend-id-dryrun",
            "status": "dry_run",
            "message": "RESEND_API_KEY is not configured",
        }

    resend.api_key = settings.RESEND_API_KEY
    recipients = [to] if isinstance(to, str) else to

    params: resend.Emails.SendParams = {
        "from": settings.RESEND_FROM_EMAIL,
        "to": recipients,
        "subject": subject,
        "html": html,
    }
    if text:
        params["text"] = text

    try:
        response = resend.Emails.send(params)
        logger.info(
            f"Email sent successfully via Resend to {recipients}. "
            f"ID: {response.get('id')}"
        )
        return response
    except Exception as e:
        logger.error(
            f"Failed to send email via Resend to {recipients}: {e}",
            exc_info=True,
        )
        return {"error": str(e), "status": "failed"}


def send_welcome_email(
    user_email: str, user_name: Optional[str] = None
) -> Dict[str, Any]:
    display_name = user_name or "Шановний користувачу"
    subject = "Вітаємо у системі Spry (Єдина система реєстрації засідань)"
    html = (
        "<div style='font-family: Arial, sans-serif; max-width: 600px; "
        "margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; "
        "border-radius: 8px;'>"
        "<div style='text-align: center; border-bottom: 2px solid #0056b3; "
        "padding-bottom: 15px;'>"
        "<h2 style='color: #0b2559; margin: 0;'>Верховна Рада України &bull; Spry</h2>"
        "<p style='color: #666; font-size: 14px; margin-top: 5px;'>"
        "Єдина інформаційна система реєстрації засідань</p></div>"
        f"<div style='padding: 20px 0;'>"
        f"<p>Вітаємо, <strong>{display_name}</strong>!</p>"
        f"<p>Ваш Google акаунт ({user_email}) авторизовано в Spry.</p>"
        "<div style='text-align: center; margin: 25px 0;'>"
        "<a href='https://1233.pp.ua' style='background-color: #0056b3; "
        "color: white; padding: 12px 24px; text-decoration: none; "
        "border-radius: 4px; font-weight: bold;'>Перейти до Spry</a></div></div>"
        "<div style='border-top: 1px solid #e0e0e0; padding-top: 15px; "
        "text-align: center; font-size: 12px; color: #999;'>"
        "&copy; 2026 Spry &bull; Апарат Верховної Ради України</div></div>"
    )
    return send_email(to=user_email, subject=subject, html=html)


def send_meeting_notification(
    to_email: str,
    meeting_title: str,
    starts_at: str,
    ends_at: str,
    attendee_count: int,
) -> Dict[str, Any]:
    subject = f"Нове засідання: {meeting_title}"
    html = (
        "<div style='font-family: Arial, sans-serif; max-width: 600px; "
        "margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;'>"
        f"<h3 style='color: #0b2559;'>Зареєстровано: {meeting_title}</h3>"
        f"<p><strong>Початок:</strong> {starts_at}</p>"
        f"<p><strong>Завершення:</strong> {ends_at}</p>"
        f"<p><strong>Учасників:</strong> {attendee_count}</p>"
        "<p><a href='https://1233.pp.ua' style='color: #0056b3; font-weight: bold;'>"
        "Переглянути в системі &rarr;</a></p></div>"
    )
    return send_email(to=to_email, subject=subject, html=html)
