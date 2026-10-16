from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class MeetingBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Meeting title")
    starts_at: datetime = Field(..., description="Meeting start time (ISO 8601 UTC)")
    ends_at: datetime = Field(..., description="Meeting end time (ISO 8601 UTC)")
    attendee_count: int = Field(..., ge=0, description="Attendee count (non-negative)")
    agenda: Optional[str] = Field(None, description="Structured agenda text")
    ai_suggestion: Optional[Dict[str, Any]] = Field(
        None, description="Original AI suggestion and metrics"
    )

    @model_validator(mode="after")
    def validate_meeting_times(self) -> "MeetingBase":
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be strictly after starts_at")
        return self


class MeetingCreate(MeetingBase):
    pass


class MeetingAgendaUpdate(BaseModel):
    agenda: str = Field(
        ..., min_length=1, description="Final agenda text saved by user"
    )
    ai_suggestion: Optional[Dict[str, Any]] = Field(
        None, description="Original AI suggested agenda and metrics"
    )


class MeetingResponse(MeetingBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
