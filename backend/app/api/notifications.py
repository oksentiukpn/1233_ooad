from typing import Optional

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

from app.services.email import send_email

router = APIRouter()


class EmailSendRequest(BaseModel):
    to: str
    subject: str
    content: str
    html: Optional[str] = None


@router.post("/send", summary="Send an email via Resend")
def send_custom_email(payload: EmailSendRequest, background_tasks: BackgroundTasks):
    html_body = payload.html or f"<p>{payload.content}</p>"

    # Execute in background to keep API response instantaneous
    background_tasks.add_task(
        send_email,
        to=payload.to,
        subject=payload.subject,
        html=html_body,
        text=payload.content,
    )

    return {
        "status": "queued",
        "message": f"Лист до {payload.to} поставлено в чергу на відправку через Resend",
    }
