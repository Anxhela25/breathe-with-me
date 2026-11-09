from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Episode, User
from app.schemas.episode import EpisodeCreate, EpisodeOut, EpisodeUpdate
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/episodes", tags=["episodes"])


def _own_episode(episode_id: int, user: User, db: Session) -> Episode:
    episode = db.get(Episode, episode_id)
    if episode is None or episode.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Episode not found.")
    return episode


@router.post("", response_model=EpisodeOut, status_code=status.HTTP_201_CREATED)
def start_episode(data: EpisodeCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    episode = Episode(user_id=user.id, start_level=data.start_level)
    if data.started_at:
        episode.started_at = data.started_at
    db.add(episode)
    db.commit()
    db.refresh(episode)
    return episode


@router.get("", response_model=list[EpisodeOut])
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = select(Episode).where(Episode.user_id == user.id).order_by(Episode.started_at.desc())
    return db.scalars(stmt).all()


@router.patch("/{episode_id}", response_model=EpisodeOut)
def update_episode(
    episode_id: int, data: EpisodeUpdate,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    episode = _own_episode(episode_id, user, db)
    changes = data.model_dump(exclude_unset=True)
    if changes.pop("finished", False):
        episode.ended_at = datetime.now(timezone.utc)
    for key, value in changes.items():
        setattr(episode, key, value)
    db.commit()
    db.refresh(episode)
    return episode
