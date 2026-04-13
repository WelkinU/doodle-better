"""Pydantic schemas for API request/response models."""

from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    user_id: str | None = None  # Client-generated UUID


class UserUpdate(BaseModel):
    username: str


class UserOut(BaseModel):
    id: str
    username: str

    class Config:
        from_attributes = True


class VoteCreate(BaseModel):
    user_id: str
    status: str  # in, out, tentative


class VoteOut(BaseModel):
    id: int
    poll_id: str
    user_id: str
    username: str
    status: str

    class Config:
        from_attributes = True


class PollOut(BaseModel):
    id: str
    template_id: str | None
    title: str
    description: str | None
    event_date: str
    start_time: str
    end_time: str
    is_closed: bool
    week_start: str
    votes: list[VoteOut]
    summary: dict[str, int]  # {"in": 5, "tentative": 2, "out": 1}

    class Config:
        from_attributes = True


class EventTemplateCreate(BaseModel):
    title: str
    description: str = ""
    day_of_week: str
    start_time: str
    end_time: str
    is_recurring: bool = False


class EventTemplateUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    day_of_week: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    is_recurring: bool | None = None
    update_future: bool = False  # Whether to update future instances


class EventTemplateOut(BaseModel):
    id: str
    title: str
    description: str | None
    day_of_week: str
    start_time: str
    end_time: str
    is_recurring: bool
    is_deleted: bool

    class Config:
        from_attributes = True


class WeekPollsOut(BaseModel):
    week_start: str
    open_polls: list[PollOut]
    closed_polls: list[PollOut]


class UsernameCollisionWarning(BaseModel):
    has_collision: bool
    message: str | None = None
