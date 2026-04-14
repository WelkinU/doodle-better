"""SQLAlchemy ORM models."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from backend.database import Base


def _generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_generate_uuid)
    username = Column(String(100), nullable=False)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    votes = relationship("Vote", back_populates="user")


class EventTemplate(Base):
    """Recurring event template. Generates Poll instances each week."""
    __tablename__ = "event_templates"

    id = Column(String(36), primary_key=True, default=_generate_uuid)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True, default="")
    day_of_week = Column(String(10), nullable=False)  # Monday, Tuesday, etc.
    start_time = Column(String(5), nullable=False)     # HH:MM 24h
    end_time = Column(String(5), nullable=False)       # HH:MM 24h
    is_recurring = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    polls = relationship("Poll", back_populates="template")


class Poll(Base):
    """A concrete poll instance for a specific date."""
    __tablename__ = "polls"

    id = Column(String(36), primary_key=True, default=_generate_uuid)
    template_id = Column(String(36), ForeignKey("event_templates.id"), nullable=True)
    created_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True, default="")
    event_date = Column(String(10), nullable=False)    # YYYY-MM-DD
    start_time = Column(String(5), nullable=False)     # HH:MM 24h
    end_time = Column(String(5), nullable=False)       # HH:MM 24h
    is_closed = Column(Boolean, default=False)
    week_start = Column(String(10), nullable=False)    # Sunday YYYY-MM-DD for grouping
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    template = relationship("EventTemplate", back_populates="polls")
    creator = relationship("User", foreign_keys=[created_by_user_id])
    votes = relationship("Vote", back_populates="poll", cascade="all, delete-orphan")


class Vote(Base):
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    poll_id = Column(String(36), ForeignKey("polls.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(10), nullable=False, default="no-reply")  # in, out, tentative, no-reply
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    poll = relationship("Poll", back_populates="votes")
    user = relationship("User", back_populates="votes")
