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
    token: str

    class Config:
        from_attributes = True


class VoteCreate(BaseModel):
    status: str  # in, out, tentative


class VoteOut(BaseModel):
    id: int
    poll_id: str
    username: str
    status: str
    is_mine: bool = False

    class Config:
        from_attributes = True


class PollOut(BaseModel):
    id: str
    template_id: str | None
    has_owner: bool  # True if created by a user (not auto-generated)
    created_by_username: str | None
    is_my_poll: bool = False  # True if the viewer is the creator
    title: str
    description: str | None
    event_date: str
    start_time: str
    end_time: str
    is_closed: bool
    is_recurring: bool
    week_start: str
    votes: list[VoteOut]
    summary: dict[str, int]  # {"in": 5, "tentative": 2, "out": 1}

    class Config:
        from_attributes = True


class UserPollCreate(BaseModel):
    title: str
    description: str = ""
    event_date: str   # YYYY-MM-DD
    start_time: str   # HH:MM
    end_time: str     # HH:MM


class UserPollUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    event_date: str | None = None
    start_time: str | None = None
    end_time: str | None = None


class EventTemplateCreate(BaseModel):
    title: str
    description: str = ""
    day_of_week: str
    start_time: str
    end_time: str
    is_recurring: bool = False
    created_by_user_id: str | None = None


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


class AdminPollUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    event_date: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    is_closed: bool | None = None


class WeekPollsOut(BaseModel):
    week_start: str
    open_polls: list[PollOut]
    closed_polls: list[PollOut]


class UsernameCollisionWarning(BaseModel):
    has_collision: bool
    message: str | None = None
