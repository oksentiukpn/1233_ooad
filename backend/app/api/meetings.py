from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_cognito_auth
from app.models.meeting import Meeting
from app.schemas.meeting import (
    MeetingAgendaUpdate,
    MeetingCreate,
    MeetingResponse,
)

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
        agenda=payload.agenda,
        ai_suggestion=payload.ai_suggestion,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.get(
    "/meetings/{meeting_id}",
    response_model=MeetingResponse,
    status_code=status.HTTP_200_OK,
)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)) -> Meeting:
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting with id {meeting_id} not found",
        )
    return meeting


@router.post(
    "/meetings/{meeting_id}/agenda",
    response_model=MeetingResponse,
    status_code=status.HTTP_200_OK,
)
def save_meeting_agenda(
    meeting_id: int, payload: MeetingAgendaUpdate, db: Session = Depends(get_db)
) -> Meeting:
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting with id {meeting_id} not found",
        )

    meeting.agenda = payload.agenda
    if payload.ai_suggestion is not None:
        meeting.ai_suggestion = payload.ai_suggestion

    db.commit()
    db.refresh(meeting)
    return meeting
