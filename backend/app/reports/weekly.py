import csv
import io
import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.meeting import Meeting

ISO_WEEK_REGEX = re.compile(r"^(\d{4})-W(0[1-9]|[1-4][0-9]|5[0-3])$")


def parse_iso_week(week_str: str) -> Tuple[datetime, datetime, str]:
    """Parse an ISO week string (e.g. '2026-W40') into UTC start and end bounds,

    and return (week_start, week_end, prev_week_str).
    week_start is Monday 00:00:00 UTC.
    week_end is the next Monday 00:00:00 UTC (exclusive bound).
    """
    if not isinstance(week_str, str) or not ISO_WEEK_REGEX.match(week_str):
        raise ValueError(
            f"Invalid ISO week format '{week_str}'. Expected 'YYYY-Www' "
            "(e.g. '2026-W40')."
        )

    year, week_num = map(int, week_str.split("-W"))
    monday = datetime.fromisocalendar(year, week_num, 1).replace(
        hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc
    )
    next_monday = monday + timedelta(days=7)

    prev_monday = monday - timedelta(days=7)
    prev_iso_year, prev_iso_week, _ = prev_monday.isocalendar()
    prev_week_str = f"{prev_iso_year}-W{prev_iso_week:02d}"

    return monday, next_monday, prev_week_str


def get_previous_iso_week(ref_date: Optional[datetime] = None) -> str:
    """Return the ISO week string for the week preceding ref_date (defaults to now UTC).

    Example: for a date in week 41, returns '2026-W40'.
    """
    now = ref_date or datetime.now(timezone.utc)
    prev_date = now - timedelta(days=7)
    iso_year, iso_week, _ = prev_date.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def get_report_filename(week: str) -> str:
    """Return deterministic filename/key for the given ISO week."""
    if not isinstance(week, str) or not ISO_WEEK_REGEX.match(week):
        raise ValueError(f"Invalid ISO week format '{week}'. Expected 'YYYY-Www'.")
    return f"reports/{week}.csv"


def _format_change(
    diff: float, pct: Optional[float], is_float: bool = False
) -> Tuple[str, str]:
    """Format absolute and percentage differences with leading + for positive values."""
    if diff > 0:
        sign = "+"
    else:
        sign = ""
    abs_str = f"{sign}{diff:.2f}" if is_float else f"{sign}{int(diff)}"
    if pct is None:
        pct_str = "N/A"
    else:
        sign_pct = "+" if pct > 0 else ""
        pct_str = f"{sign_pct}{pct:.1f}%"
    return abs_str, pct_str


def _calc_pct_change(current: float, previous: float) -> Optional[float]:
    if previous == 0:
        return 100.0 if current > 0 else (0.0 if current == 0 else -100.0)
    return ((current - previous) / previous) * 100.0


def _meeting_duration_hours(meeting: Meeting) -> float:
    if meeting.ends_at and meeting.starts_at and meeting.ends_at > meeting.starts_at:
        return (meeting.ends_at - meeting.starts_at).total_seconds() / 3600.0
    return 0.0


def _format_datetime_utc(dt: Optional[datetime]) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _query_week_meetings(
    db: Session, start_dt: datetime, end_dt: datetime
) -> List[Meeting]:
    stmt = (
        select(Meeting)
        .where(Meeting.starts_at >= start_dt, Meeting.starts_at < end_dt)
        .order_by(Meeting.starts_at.asc())
    )
    return list(db.scalars(stmt).all())


def build_weekly_report(week: str, db: Optional[Session] = None) -> bytes:
    """Query the meetings of one ISO week (e.g. '2026-W40') and return the CSV as bytes.

    Rules:
    - week is an explicit parameter (never assumes 'last week' internally).
    - deterministic: identical inputs yield identical reports.
    - contains metrics for the requested week and previous week, with changes.
    - contains top 5 longest meetings of the requested week.
    """
    monday, next_monday, prev_week_str = parse_iso_week(week)
    prev_monday = monday - timedelta(days=7)

    def _execute(session: Session) -> bytes:
        curr_meetings = _query_week_meetings(session, monday, next_monday)
        prev_meetings = _query_week_meetings(session, prev_monday, monday)

        # Current week metrics
        curr_count = len(curr_meetings)
        curr_duration = sum(_meeting_duration_hours(m) for m in curr_meetings)
        curr_attendees = sum(m.attendee_count for m in curr_meetings)
        curr_avg_duration = (curr_duration / curr_count) if curr_count > 0 else 0.0

        # Previous week metrics
        prev_count = len(prev_meetings)
        prev_duration = sum(_meeting_duration_hours(m) for m in prev_meetings)
        prev_attendees = sum(m.attendee_count for m in prev_meetings)
        prev_avg_duration = (prev_duration / prev_count) if prev_count > 0 else 0.0

        # Differences and percentage changes
        diff_count = curr_count - prev_count
        pct_count = _calc_pct_change(curr_count, prev_count)
        diff_count_str, pct_count_str = _format_change(
            diff_count, pct_count, is_float=False
        )

        diff_duration = curr_duration - prev_duration
        pct_duration = _calc_pct_change(curr_duration, prev_duration)
        diff_dur_str, pct_dur_str = _format_change(
            diff_duration, pct_duration, is_float=True
        )

        diff_attendees = curr_attendees - prev_attendees
        pct_attendees = _calc_pct_change(curr_attendees, prev_attendees)
        diff_att_str, pct_att_str = _format_change(
            diff_attendees, pct_attendees, is_float=False
        )

        diff_avg_dur = curr_avg_duration - prev_avg_duration
        pct_avg_dur = _calc_pct_change(curr_avg_duration, prev_avg_duration)
        diff_avg_dur_str, pct_avg_dur_str = _format_change(
            diff_avg_dur, pct_avg_dur, is_float=True
        )

        # Top 5 longest meetings for current week
        sorted_by_duration = sorted(
            curr_meetings,
            key=lambda m: (_meeting_duration_hours(m), m.starts_at),
            reverse=True,
        )
        top_5_meetings = sorted_by_duration[:5]

        # Assemble CSV
        buffer = io.StringIO()
        writer = csv.writer(buffer, lineterminator="\n")

        # Section 1: Executive Summary
        writer.writerow(["SECTION", "EXECUTIVE_WEEKLY_SUMMARY"])
        writer.writerow(
            [
                "METRIC",
                f"CURRENT_WEEK ({week})",
                f"PREVIOUS_WEEK ({prev_week_str})",
                "ABSOLUTE_CHANGE",
                "PERCENTAGE_CHANGE",
            ]
        )
        writer.writerow(
            [
                "Meetings Count",
                curr_count,
                prev_count,
                diff_count_str,
                pct_count_str,
            ]
        )
        writer.writerow(
            [
                "Total Duration (Hours)",
                f"{curr_duration:.2f}",
                f"{prev_duration:.2f}",
                diff_dur_str,
                pct_dur_str,
            ]
        )
        writer.writerow(
            [
                "Average Duration (Hours)",
                f"{curr_avg_duration:.2f}",
                f"{prev_avg_duration:.2f}",
                diff_avg_dur_str,
                pct_avg_dur_str,
            ]
        )
        writer.writerow(
            [
                "Total Attendees",
                curr_attendees,
                prev_attendees,
                diff_att_str,
                pct_att_str,
            ]
        )

        writer.writerow([])  # Empty separator line

        # Section 2: Top 5 Longest Meetings
        writer.writerow(["SECTION", "TOP_5_LONGEST_MEETINGS"])
        writer.writerow(
            [
                "RANK",
                "TITLE",
                "STARTS_AT",
                "DURATION_HOURS",
                "PARTICIPANTS",
            ]
        )

        if not top_5_meetings:
            writer.writerow(["-", "No meetings recorded for this week", "-", "-", "-"])
        else:
            for rank, meeting in enumerate(top_5_meetings, start=1):
                starts_iso = _format_datetime_utc(meeting.starts_at)
                dur_hours = _meeting_duration_hours(meeting)
                writer.writerow(
                    [
                        rank,
                        meeting.title,
                        starts_iso,
                        f"{dur_hours:.2f}",
                        meeting.attendee_count,
                    ]
                )

        return buffer.getvalue().encode("utf-8-sig")

    if db is not None:
        return _execute(db)
    else:
        with SessionLocal() as session:
            return _execute(session)
