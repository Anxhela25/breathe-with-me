from statistics import median

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CalmCheck, Episode, User
from app.schemas.calm_check import CalmBaselineOut, CalmCheckIn, CalmCheckOut
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/calm-checks", tags=["calm check"])

BASELINE_CHECKS = 10  # her usual level is the median of her last 10 checks


@router.get("/baseline", response_model=CalmBaselineOut)
def baseline(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.scalar(select(func.count()).select_from(CalmCheck).where(CalmCheck.user_id == user.id))
    levels = db.scalars(select(CalmCheck.level).where(CalmCheck.user_id == user.id)
                        .order_by(CalmCheck.created_at.desc()).limit(BASELINE_CHECKS)).all()
    return CalmBaselineOut(count=count, baseline=median(levels) if levels else None)


@router.post("", response_model=CalmCheckOut, status_code=status.HTTP_201_CREATED)
def save(data: CalmCheckIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.episode_id is not None:
        episode = db.get(Episode, data.episode_id)
        if episode is None or episode.user_id != user.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Episode not found.")
    check = CalmCheck(user_id=user.id, **data.model_dump())
    db.add(check)
    db.commit()
    db.refresh(check)
    return check


@router.get("", response_model=list[CalmCheckOut])
def list_checks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(CalmCheck).where(CalmCheck.user_id == user.id).order_by(CalmCheck.created_at.desc())).all()
