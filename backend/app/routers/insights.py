from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Episode, User
from app.services.auth import get_current_user
from app.services.insights import summarize

router = APIRouter(prefix="/api/insights", tags=["insights"])


class Pattern(BaseModel):
    key: str
    text: str


class InsightsOut(BaseModel):
    count: int
    needed: int
    ready: bool
    patterns: list[Pattern]
    average_strength: float | None
    average_drop: float | None
    first: datetime | None
    last: datetime | None


@router.get("", response_model=InsightsOut)
def insights(
    tz: str = Query("UTC", max_length=64, description="The user's time zone, e.g. Europe/Tirane"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        zone = ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError):
        zone = ZoneInfo("UTC")
    episodes = db.scalars(select(Episode).where(Episode.user_id == user.id)).all()
    return summarize(list(episodes), zone)
