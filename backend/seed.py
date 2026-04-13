"""Seed default recurring event templates."""

from sqlalchemy.orm import Session

from backend.config import config
from backend.models import EventTemplate


def seed_defaults(db: Session) -> None:
    existing_count = db.query(EventTemplate).count()
    if existing_count > 0:
        return

    for evt in config.default_events:
        tmpl = EventTemplate(**evt)
        db.add(tmpl)
    db.commit()
