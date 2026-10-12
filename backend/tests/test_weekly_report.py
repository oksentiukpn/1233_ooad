from datetime import datetime, timezone

import pytest

from app.models.meeting import Meeting
from app.reports.weekly import (
    build_weekly_report,
    get_previous_iso_week,
    get_report_filename,
    parse_iso_week,
)


def test_parse_iso_week_valid():
    monday, next_monday, prev_week = parse_iso_week("2026-W40")
    assert monday == datetime(2026, 9, 28, 0, 0, 0, tzinfo=timezone.utc)
    assert next_monday == datetime(2026, 10, 5, 0, 0, 0, tzinfo=timezone.utc)
    assert prev_week == "2026-W39"


def test_parse_iso_week_first_week_of_year():
    monday, next_monday, prev_week = parse_iso_week("2026-W01")
    assert monday.year in (2025, 2026)
    assert prev_week.startswith("2025-W")


def test_parse_iso_week_invalid():
    for invalid in ["2026-40", "invalid", "2026-W00", "2026-W55", "", None]:
        with pytest.raises(ValueError):
            parse_iso_week(invalid)  # type: ignore


def test_get_previous_iso_week():
    ref = datetime(2026, 10, 8, 12, 0, 0, tzinfo=timezone.utc)  # Week 41
    prev = get_previous_iso_week(ref)
    assert prev == "2026-W40"


def test_get_report_filename():
    assert get_report_filename("2026-W40") == "reports/2026-W40.csv"
    with pytest.raises(ValueError):
        get_report_filename("invalid")


def test_build_weekly_report_empty(db_session):
    report_bytes = build_weekly_report("2026-W40", db=db_session)
    assert isinstance(report_bytes, bytes)
    content = report_bytes.decode("utf-8-sig")

    assert "EXECUTIVE_WEEKLY_SUMMARY" in content
    assert "CURRENT_WEEK (2026-W40)" in content
    assert "PREVIOUS_WEEK (2026-W39)" in content
    assert "Meetings Count,0,0,0,0.0%" in content
    assert "Total Duration (Hours),0.00,0.00,0.00,0.0%" in content
    assert "No meetings recorded for this week" in content


def test_build_weekly_report_with_meetings_and_top5(db_session):
    # Week 39: 2026-09-21 to 2026-09-27
    m_prev1 = Meeting(
        title="Засідання комітету W39-1",
        starts_at=datetime(2026, 9, 22, 10, 0, tzinfo=timezone.utc),
        ends_at=datetime(2026, 9, 22, 12, 0, tzinfo=timezone.utc),  # 2.0h
        attendee_count=20,
    )
    m_prev2 = Meeting(
        title="Засідання комітету W39-2",
        starts_at=datetime(2026, 9, 23, 14, 0, tzinfo=timezone.utc),
        ends_at=datetime(2026, 9, 23, 15, 30, tzinfo=timezone.utc),  # 1.5h
        attendee_count=15,
    )
    db_session.add_all([m_prev1, m_prev2])

    # Week 40: 2026-09-28 to 2026-10-04
    # Create 6 meetings to test top-5 cutoff and sorting
    meetings_w40 = [
        Meeting(
            title="Коротке засідання",
            starts_at=datetime(2026, 9, 28, 9, 0, tzinfo=timezone.utc),
            ends_at=datetime(2026, 9, 28, 9, 30, tzinfo=timezone.utc),  # 0.5h
            attendee_count=50,
        ),
        Meeting(
            title="Найдовше пленарне засідання",
            starts_at=datetime(2026, 9, 29, 10, 0, tzinfo=timezone.utc),
            ends_at=datetime(2026, 9, 29, 16, 0, tzinfo=timezone.utc),  # 6.0h
            attendee_count=450,
        ),
        Meeting(
            title="Засідання робочої групи А",
            starts_at=datetime(2026, 9, 30, 11, 0, tzinfo=timezone.utc),
            ends_at=datetime(2026, 9, 30, 14, 0, tzinfo=timezone.utc),  # 3.0h
            attendee_count=100,
        ),
        Meeting(
            title="Засідання робочої групи Б",
            starts_at=datetime(2026, 10, 1, 10, 0, tzinfo=timezone.utc),
            ends_at=datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc),  # 2.0h
            attendee_count=120,
        ),
        Meeting(
            title="Засідання робочої групи В",
            starts_at=datetime(2026, 10, 2, 12, 0, tzinfo=timezone.utc),
            ends_at=datetime(2026, 10, 2, 13, 0, tzinfo=timezone.utc),  # 1.0h
            attendee_count=80,
        ),
        Meeting(
            title="Засідання робочої групи Г",
            starts_at=datetime(2026, 10, 3, 10, 0, tzinfo=timezone.utc),
            ends_at=datetime(2026, 10, 3, 10, 45, tzinfo=timezone.utc),  # 0.75h
            attendee_count=60,
        ),
    ]
    db_session.add_all(meetings_w40)
    db_session.commit()

    # Generate report for week 40
    report_bytes = build_weekly_report("2026-W40", db=db_session)
    content = report_bytes.decode("utf-8-sig")

    # Metrics assertions:
    # W40 count: 6, W39 count: 2 -> diff: +4 (+200.0%)
    assert "Meetings Count,6,2,+4,+200.0%" in content
    # W40 dur: 0.5+6.0+3.0+2.0+1.0+0.75 = 13.25h. W39 dur: 2.0+1.5 = 3.50h. diff: +9.75
    assert "Total Duration (Hours),13.25,3.50,+9.75,+278.6%" in content
    # W40 attendees: 50+450+100+120+80+60 = 860. W39: 35. diff: +825
    assert "Total Attendees,860,35,+825,+2357.1%" in content

    # Top-5 checks:
    # Rank 1 must be "Найдовше пленарне засідання" (6.00h)
    assert "1,Найдовше пленарне засідання,2026-09-29T10:00:00+00:00,6.00,450" in content
    # Rank 2 must be "Засідання робочої групи А" (3.00h)
    assert "2,Засідання робочої групи А,2026-09-30T11:00:00+00:00,3.00,100" in content
    # Rank 3 must be "Засідання робочої групи Б" (2.00h)
    assert "3,Засідання робочої групи Б,2026-10-01T10:00:00+00:00,2.00,120" in content
    # Rank 4 must be "Засідання робочої групи В" (1.00h)
    assert "4,Засідання робочої групи В,2026-10-02T12:00:00+00:00,1.00,80" in content
    # Rank 5 must be "Засідання робочої групи Г" (0.75h)
    assert "5,Засідання робочої групи Г,2026-10-03T10:00:00+00:00,0.75,60" in content
    # 6th meeting (0.50h) must NOT be in top 5 list
    assert "Коротке засідання" not in content


def test_build_weekly_report_idempotency(db_session):
    # Calling multiple times produces exact same output bytes
    run1 = build_weekly_report("2026-W40", db=db_session)
    run2 = build_weekly_report("2026-W40", db=db_session)
    assert run1 == run2
    assert len(run1) > 0
