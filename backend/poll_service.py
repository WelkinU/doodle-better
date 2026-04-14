"""Poll generation and week-boundary utilities."""

from datetime import date, datetime, time, timedelta

import pytz
from sqlalchemy.orm import Session

from backend.config import config
from backend.models import EventTemplate, Poll

_TZ = pytz.timezone(config.timezone)

_DAY_MAP = {
    "monday": 0, "tuesday": 1, "wednesday": 2,
    "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6,
}


def get_current_time() -> datetime:
    return datetime.now(_TZ)


def get_week_start(for_date: date | None = None) -> date:
    """Return the Sunday that starts the current (or given) week."""
    if for_date is None:
        for_date = get_current_time().date()
    days_since_sunday = (for_date.weekday() + 1) % 7
    return for_date - timedelta(days=days_since_sunday)


def get_week_end(week_start: date) -> date:
    """Saturday end of the week."""
    return week_start + timedelta(days=6)


def is_poll_closed(poll: Poll) -> bool:
    """Check if a poll should be closed based on current time."""
    now = get_current_time()
    event_date = date.fromisoformat(poll.event_date)
    if poll.end_time:
        h, m = map(int, poll.end_time.split(":"))
        event_end = _TZ.localize(datetime.combine(event_date, time(h, m)))
    else:
        event_end = _TZ.localize(datetime.combine(event_date, time(23, 59)))
    return now > event_end


def create_poll_from_template(
    db: Session,
    tmpl: "EventTemplate",
    week_start_date: date,
    created_by_user_id: str | None = None,
) -> "Poll | None":
    """Create and persist a single poll for a template in the given week.
    Returns the new Poll, or None if the day_of_week is unrecognised.
    Does NOT commit — caller is responsible for commit.
    """
    ws = week_start_date
    ws_str = ws.isoformat()
    day_idx = _DAY_MAP.get(tmpl.day_of_week.lower())
    if day_idx is None:
        return None
    sunday_idx = 6
    offset = 0 if day_idx >= sunday_idx else day_idx + 1
    event_date = ws + timedelta(days=offset)
    poll = Poll(
        template_id=tmpl.id,
        title=tmpl.title,
        description=tmpl.description,
        event_date=event_date.isoformat(),
        start_time=tmpl.start_time,
        end_time=tmpl.end_time,
        is_closed=False,
        week_start=ws_str,
        created_by_user_id=created_by_user_id,
    )
    db.add(poll)
    return poll


def ensure_polls_for_week(db: Session, week_start_date: date | None = None) -> list[Poll]:
    """Lazy-generate polls for the given week from recurring templates."""
    ws = week_start_date or get_week_start()
    ws_str = ws.isoformat()

    existing = db.query(Poll).filter(Poll.week_start == ws_str).all()
    existing_template_ids = {p.template_id for p in existing if p.template_id}

    templates = db.query(EventTemplate).filter(
        EventTemplate.is_recurring == True,  # noqa: E712
        EventTemplate.is_deleted == False,    # noqa: E712
    ).all()

    new_polls = []
    for tmpl in templates:
        if tmpl.id in existing_template_ids:
            continue
        day_idx = _DAY_MAP.get(tmpl.day_of_week.lower())
        if day_idx is None:
            continue
        # Calculate the date for this day within the week
        sunday_idx = 6
        if day_idx >= sunday_idx:
            offset = 0  # Sunday is day 0 of our week
        else:
            offset = day_idx + 1  # Mon=1, Tue=2, ...
        event_date = ws + timedelta(days=offset)

        poll = Poll(
            template_id=tmpl.id,
            title=tmpl.title,
            description=tmpl.description,
            event_date=event_date.isoformat(),
            start_time=tmpl.start_time,
            end_time=tmpl.end_time,
            is_closed=False,
            week_start=ws_str,
        )
        db.add(poll)
        new_polls.append(poll)

    if new_polls:
        db.commit()

    # Auto-close any polls that should be closed
    all_polls = db.query(Poll).filter(Poll.week_start == ws_str).all()
    for poll in all_polls:
        if not poll.is_closed and is_poll_closed(poll):
            poll.is_closed = True
    db.commit()

    return db.query(Poll).filter(Poll.week_start == ws_str).all()
