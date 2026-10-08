from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_cognito_auth
from app.models.meeting import Meeting
from app.schemas.meeting import MeetingCreate, MeetingResponse

router = APIRouter(dependencies=[Depends(require_cognito_auth)])


@router.get(
    "/meetings", response_model=List[MeetingResponse], status_code=status.HTTP_200_OK
)
def list_meetings(db: Session = Depends(get_db)) -> List[Meeting]:
    stmt = select(Meeting).order_by(Meeting.starts_at.asc())
    result = db.scalars(stmt).all()
    return list(result)


@router.post(
    "/meetings", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED
)
def create_meeting(payload: MeetingCreate, db: Session = Depends(get_db)) -> Meeting:
    meeting = Meeting(
        title=payload.title,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        attendee_count=payload.attendee_count,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting
