import logging
from dataclasses import asdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas.chat import ChatIn, ChatOut, PauseOut
from app.services.auth import get_current_user, get_optional_user
from app.services.chat import run_chat

router = APIRouter(prefix="/api/chat", tags=["chat"])
log = logging.getLogger("breathe.chat")


def _aware(moment: datetime) -> datetime:
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)


def _pause(user: User | None, db: Session, now: datetime) -> datetime:
    # a new crisis restarts the pause
    until = now + timedelta(minutes=settings.chat_pause_minutes)
    if user:
        user.chat_paused_until = until
        user.chat_checkin_due = True
        db.commit()
        log.info("Chat paused for account %d for %d minutes", user.id, settings.chat_pause_minutes)
    return until


@router.post("/pause", response_model=PauseOut)
def pause(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return PauseOut(paused_until=_pause(user, db, datetime.now(timezone.utc)))


@router.post("", response_model=ChatOut)
def chat(data: ChatIn, user: User | None = Depends(get_optional_user), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    # during the 24h pause the AI isn't called at all (without an account the app keeps it)
    if user and user.chat_paused_until and _aware(user.chat_paused_until) > now:
        log.info("Chat paused for account %d: AI not called", user.id)
        return ChatOut(kind="paused", reply=None, emergency_note=False, next_step="urgent", source="fixed",
                       paused_until=user.chat_paused_until)

    history = [line.model_dump() for line in data.history]
    result = asdict(run_chat(data.message, history, data.level, data.safe_confirmed))

    if result["kind"] == "crisis":
        result["paused_until"] = _pause(user, db, now)
    elif user and user.chat_checkin_due:
        # wrote again after the pause, check-in is done
        user.chat_checkin_due = False
        db.commit()
    return result
