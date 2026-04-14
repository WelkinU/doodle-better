"""API routes for polls, votes, and users."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import and_
from sqlalchemy.orm import Session

from backend.config import config
from backend.database import get_db
from backend.models import EventTemplate, Poll, User, Vote
from backend.poll_service import ensure_polls_for_week, get_week_start, is_poll_closed, create_poll_from_template
from backend.schemas import (
    EventTemplateCreate,
    EventTemplateOut,
    EventTemplateUpdate,
    PollOut,
    UserCreate,
    UserOut,
    UsernameCollisionWarning,
    UserPollCreate,
    UserPollUpdate,
    VoteCreate,
    VoteOut,
    WeekPollsOut,
)

router = APIRouter(prefix="/api")


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_ip_blacklist(request: Request):
    ip = _get_client_ip(request)
    if ip in config.ip_blacklist:
        raise HTTPException(status_code=403, detail="Access denied")


def _check_admin(request: Request):
    ip = _get_client_ip(request)
    if ip not in config.admin_ip_allowlist:
        raise HTTPException(status_code=403, detail="Admin access required")


def _is_admin(request: Request) -> bool:
    ip = _get_client_ip(request)
    return ip in config.admin_ip_allowlist


def _check_username_blacklist(username: str):
    if username.strip().lower() in [u.lower() for u in config.username_blacklist]:
        raise HTTPException(status_code=403, detail="This username is not allowed")


def _poll_to_out(poll: Poll, viewer_user_id: str | None = None) -> PollOut:
    votes_out = []
    for v in poll.votes:
        votes_out.append(VoteOut(
            id=v.id,
            poll_id=v.poll_id,
            username=v.user.username if v.user else "Unknown",
            status=v.status,
            is_mine=(viewer_user_id is not None and v.user_id == viewer_user_id),
        ))
    summary = {"in": 0, "tentative": 0, "out": 0}
    for v in votes_out:
        if v.status in summary:
            summary[v.status] += 1
    return PollOut(
        id=poll.id,
        template_id=poll.template_id,
        has_owner=poll.created_by_user_id is not None,
        created_by_username=poll.creator.username if poll.creator else None,
        is_my_poll=(viewer_user_id is not None and poll.created_by_user_id == viewer_user_id),
        title=poll.title,
        description=poll.description,
        event_date=poll.event_date,
        start_time=poll.start_time,
        end_time=poll.end_time,
        is_closed=poll.is_closed,
        is_recurring=poll.template.is_recurring if poll.template else False,
        week_start=poll.week_start,
        votes=votes_out,
        summary=summary,
    )


# ── User endpoints ──────────────────────────────────────────────────

@router.post("/users", response_model=UserOut)
def create_or_get_user(data: UserCreate, request: Request, db: Session = Depends(get_db)):
    _check_ip_blacklist(request)
    _check_username_blacklist(data.username)
    ip = _get_client_ip(request)

    if data.user_id:
        existing = db.query(User).filter(User.id == data.user_id).first()
        if existing:
            existing.username = data.username.strip()
            existing.ip_address = ip
            db.commit()
            db.refresh(existing)
            return existing

    user = User(
        id=data.user_id if data.user_id else None,
        username=data.username.strip(),
        ip_address=ip,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserOut)
def update_username(user_id: str, data: UserCreate, request: Request, db: Session = Depends(get_db)):
    _check_ip_blacklist(request)
    _check_username_blacklist(data.username)
    ip = _get_client_ip(request)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.username = data.username.strip()
    user.ip_address = ip
    db.commit()
    db.refresh(user)
    return user


@router.get("/users/{user_id}/collision", response_model=UsernameCollisionWarning)
def check_username_collision(user_id: str, poll_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return UsernameCollisionWarning(has_collision=False)

    # Check if another user with same username voted on this poll
    votes = db.query(Vote).filter(Vote.poll_id == poll_id).all()
    for v in votes:
        if v.user_id != user_id and v.user and v.user.username.lower() == user.username.lower():
            return UsernameCollisionWarning(
                has_collision=True,
                message=f'Another user named "{user.username}" already voted on this poll. '
                        f'Consider using a different username to avoid confusion!'
            )
    return UsernameCollisionWarning(has_collision=False)


@router.get("/admin/check")
def check_admin(request: Request):
    return {"is_admin": _is_admin(request)}


# ── Poll endpoints ──────────────────────────────────────────────────

@router.get("/polls/week", response_model=WeekPollsOut)
def get_current_week_polls(request: Request, db: Session = Depends(get_db), viewer_user_id: str | None = None):
    _check_ip_blacklist(request)
    ws = get_week_start()
    polls = ensure_polls_for_week(db, ws)

    open_polls = sorted(
        [p for p in polls if not p.is_closed],
        key=lambda p: (p.event_date, p.start_time),
    )
    closed_polls = sorted(
        [p for p in polls if p.is_closed],
        key=lambda p: (p.event_date, p.start_time),
    )
    return WeekPollsOut(
        week_start=ws.isoformat(),
        open_polls=[_poll_to_out(p, viewer_user_id) for p in open_polls],
        closed_polls=[_poll_to_out(p, viewer_user_id) for p in closed_polls],
    )


@router.get("/polls/week/{week_start_str}", response_model=WeekPollsOut)
def get_week_polls(week_start_str: str, request: Request, db: Session = Depends(get_db), viewer_user_id: str | None = None):
    _check_ip_blacklist(request)
    try:
        ws = date.fromisoformat(week_start_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    polls = ensure_polls_for_week(db, ws)
    open_polls = sorted(
        [p for p in polls if not p.is_closed],
        key=lambda p: (p.event_date, p.start_time),
    )
    closed_polls = sorted(
        [p for p in polls if p.is_closed],
        key=lambda p: (p.event_date, p.start_time),
    )
    return WeekPollsOut(
        week_start=ws.isoformat(),
        open_polls=[_poll_to_out(p, viewer_user_id) for p in open_polls],
        closed_polls=[_poll_to_out(p, viewer_user_id) for p in closed_polls],
    )


@router.get("/polls/weeks", response_model=list[str])
def list_available_weeks(request: Request, db: Session = Depends(get_db)):
    """List all weeks that have polls (for history navigation)."""
    _check_ip_blacklist(request)
    weeks = db.query(Poll.week_start).distinct().order_by(Poll.week_start.desc()).all()
    current_ws = get_week_start().isoformat()
    week_list = [w[0] for w in weeks]
    if current_ws not in week_list:
        week_list.insert(0, current_ws)
    return sorted(week_list, reverse=True)


# ── Vote endpoints ──────────────────────────────────────────────────

@router.post("/polls/{poll_id}/vote", response_model=VoteOut)
def cast_vote(poll_id: str, data: VoteCreate, request: Request, db: Session = Depends(get_db)):
    _check_ip_blacklist(request)
    ip = _get_client_ip(request)

    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    # Re-check closure
    if is_poll_closed(poll):
        poll.is_closed = True
        db.commit()
        raise HTTPException(status_code=400, detail="This poll is closed")

    if data.status not in ("in", "out", "tentative"):
        raise HTTPException(status_code=400, detail="Invalid vote status")

    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Register first.")

    _check_username_blacklist(user.username)

    # Upsert vote
    existing_vote = db.query(Vote).filter(
        and_(Vote.poll_id == poll_id, Vote.user_id == data.user_id)
    ).first()

    if existing_vote:
        existing_vote.status = data.status
        existing_vote.ip_address = ip
        db.commit()
        db.refresh(existing_vote)
        return VoteOut(
            id=existing_vote.id,
            poll_id=existing_vote.poll_id,
            username=user.username,
            status=existing_vote.status,
            is_mine=True,
        )

    vote = Vote(
        poll_id=poll_id,
        user_id=data.user_id,
        status=data.status,
        ip_address=ip,
    )
    db.add(vote)
    db.commit()
    db.refresh(vote)
    return VoteOut(
        id=vote.id,
        poll_id=vote.poll_id,
        username=user.username,
        status=vote.status,
        is_mine=True,
    )


@router.delete("/polls/{poll_id}/vote/{user_id}")
def remove_vote(poll_id: str, user_id: str, request: Request, db: Session = Depends(get_db)):
    _check_ip_blacklist(request)

    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    if poll.is_closed:
        raise HTTPException(status_code=400, detail="This poll is closed")

    vote = db.query(Vote).filter(
        and_(Vote.poll_id == poll_id, Vote.user_id == user_id)
    ).first()
    if not vote:
        raise HTTPException(status_code=404, detail="Vote not found")

    db.delete(vote)
    db.commit()
    return {"ok": True}


# ── User poll management (non-admin) ────────────────────────────────

@router.post("/polls", response_model=PollOut)
def user_create_poll(data: UserPollCreate, request: Request, db: Session = Depends(get_db)):
    _check_ip_blacklist(request)
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Register first.")
    try:
        ed = date.fromisoformat(data.event_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    ws = get_week_start(ed)
    poll = Poll(
        title=data.title.strip(),
        description=data.description.strip(),
        event_date=data.event_date,
        start_time=data.start_time,
        end_time=data.end_time,
        week_start=ws.isoformat(),
        created_by_user_id=data.user_id,
    )
    db.add(poll)
    db.commit()
    db.refresh(poll)
    return _poll_to_out(poll)


@router.put("/polls/{poll_id}", response_model=PollOut)
def user_update_poll(poll_id: str, data: UserPollUpdate, request: Request, db: Session = Depends(get_db)):
    _check_ip_blacklist(request)
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    if poll.created_by_user_id != data.user_id and not _is_admin(request):
        raise HTTPException(status_code=403, detail="You can only edit polls you created")
    if poll.is_closed:
        raise HTTPException(status_code=400, detail="Cannot edit a closed poll")
    if data.title is not None:
        poll.title = data.title.strip()
    if data.description is not None:
        poll.description = data.description.strip()
    if data.event_date is not None:
        try:
            ed = date.fromisoformat(data.event_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
        poll.event_date = data.event_date
        poll.week_start = get_week_start(ed).isoformat()
    if data.start_time is not None:
        poll.start_time = data.start_time
    if data.end_time is not None:
        poll.end_time = data.end_time
    db.commit()
    db.refresh(poll)
    return _poll_to_out(poll)


@router.delete("/polls/{poll_id}")
def user_delete_poll(poll_id: str, user_id: str, request: Request, db: Session = Depends(get_db)):
    _check_ip_blacklist(request)
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    if poll.created_by_user_id != user_id and not _is_admin(request):
        raise HTTPException(status_code=403, detail="You can only delete polls you created")
    db.delete(poll)
    db.commit()
    return {"ok": True}


# ── Admin: Event Template endpoints ──────────────────────────────────

@router.get("/admin/templates", response_model=list[EventTemplateOut])
def list_templates(request: Request, db: Session = Depends(get_db)):
    _check_admin(request)
    return db.query(EventTemplate).filter(EventTemplate.is_deleted == False).all()  # noqa: E712


@router.post("/admin/templates", response_model=EventTemplateOut)
def create_template(data: EventTemplateCreate, request: Request, db: Session = Depends(get_db)):
    _check_admin(request)
    tmpl = EventTemplate(
        title=data.title,
        description=data.description,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        is_recurring=data.is_recurring,
    )
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)

    # Immediately create the poll for the current week so it shows on the homepage,
    # regardless of whether the template is recurring or one-off.
    ws = get_week_start()
    create_poll_from_template(db, tmpl, ws, created_by_user_id=data.created_by_user_id)
    db.commit()

    return tmpl


@router.put("/admin/templates/{template_id}", response_model=EventTemplateOut)
def update_template(template_id: str, data: EventTemplateUpdate, request: Request, db: Session = Depends(get_db)):
    _check_admin(request)
    tmpl = db.query(EventTemplate).filter(EventTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    update_fields = data.model_dump(exclude_unset=True, exclude={"update_future"})
    for field, value in update_fields.items():
        setattr(tmpl, field, value)
    db.commit()
    db.refresh(tmpl)

    # If update_future, update all future un-voted poll instances from this template
    if data.update_future:
        from backend.poll_service import get_current_time
        today = get_current_time().date().isoformat()
        future_polls = db.query(Poll).filter(
            Poll.template_id == template_id,
            Poll.event_date >= today,
            Poll.is_closed == False,  # noqa: E712
        ).all()
        for poll in future_polls:
            if "title" in update_fields:
                poll.title = update_fields["title"]
            if "description" in update_fields:
                poll.description = update_fields["description"]
            if "start_time" in update_fields:
                poll.start_time = update_fields["start_time"]
            if "end_time" in update_fields:
                poll.end_time = update_fields["end_time"]
        db.commit()

    return tmpl


@router.delete("/admin/templates/{template_id}")
def delete_template(
    template_id: str,
    delete_future: bool = False,
    request: Request = None,
    db: Session = Depends(get_db),
):
    _check_admin(request)
    tmpl = db.query(EventTemplate).filter(EventTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")

    tmpl.is_deleted = True
    tmpl.is_recurring = False
    db.commit()

    if delete_future:
        from backend.poll_service import get_current_time
        today = get_current_time().date().isoformat()
        affected_polls = db.query(Poll).filter(
            Poll.template_id == template_id,
            Poll.event_date >= today,
        ).all()
        for poll in affected_polls:
            # Only delete if no votes — preserve voting history
            if not poll.votes:
                db.delete(poll)
            else:
                poll.is_closed = True
        db.commit()

    return {"ok": True}


# ── Admin: Direct poll management ───────────────────────────────────

@router.get("/admin/polls", response_model=list[PollOut])
def admin_list_polls(request: Request, week: str | None = None, db: Session = Depends(get_db)):
    _check_admin(request)
    q = db.query(Poll)
    if week:
        q = q.filter(Poll.week_start == week)
    polls = q.order_by(Poll.event_date.desc(), Poll.start_time).all()
    return [_poll_to_out(p) for p in polls]


@router.post("/admin/polls", response_model=PollOut)
def admin_create_poll(
    request: Request,
    title: str,
    event_date: str,
    start_time: str,
    end_time: str,
    description: str = "",
    db: Session = Depends(get_db),
):
    _check_admin(request)
    try:
        ed = date.fromisoformat(event_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date")
    ws = get_week_start(ed)
    poll = Poll(
        title=title,
        description=description,
        event_date=event_date,
        start_time=start_time,
        end_time=end_time,
        week_start=ws.isoformat(),
    )
    db.add(poll)
    db.commit()
    db.refresh(poll)
    return _poll_to_out(poll)


@router.put("/admin/polls/{poll_id}", response_model=PollOut)
def admin_update_poll(poll_id: str, request: Request, db: Session = Depends(get_db),
                      title: str | None = None, description: str | None = None,
                      event_date: str | None = None, start_time: str | None = None,
                      end_time: str | None = None, is_closed: bool | None = None):
    _check_admin(request)
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    if title is not None:
        poll.title = title
    if description is not None:
        poll.description = description
    if event_date is not None:
        poll.event_date = event_date
        poll.week_start = get_week_start(date.fromisoformat(event_date)).isoformat()
    if start_time is not None:
        poll.start_time = start_time
    if end_time is not None:
        poll.end_time = end_time
    if is_closed is not None:
        poll.is_closed = is_closed
    db.commit()
    db.refresh(poll)
    return _poll_to_out(poll)


@router.delete("/admin/polls/{poll_id}")
def admin_delete_poll(poll_id: str, request: Request, db: Session = Depends(get_db)):
    _check_admin(request)
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    db.delete(poll)
    db.commit()
    return {"ok": True}


@router.delete("/admin/polls/{poll_id}/votes")
def admin_reset_votes(poll_id: str, request: Request, db: Session = Depends(get_db)):
    _check_admin(request)
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    db.query(Vote).filter(Vote.poll_id == poll_id).delete()
    db.commit()
    return {"ok": True}


@router.delete("/admin/polls/{poll_id}/votes/{vote_id}")
def admin_remove_vote(poll_id: str, vote_id: int, request: Request, db: Session = Depends(get_db)):
    _check_admin(request)
    vote = db.query(Vote).filter(Vote.id == vote_id, Vote.poll_id == poll_id).first()
    if not vote:
        raise HTTPException(status_code=404, detail="Vote not found")
    db.delete(vote)
    db.commit()
    return {"ok": True}
