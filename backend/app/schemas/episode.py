from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import Place, Sleep

Level = Field(default=None, ge=1, le=10)


class EpisodeCreate(BaseModel):
    start_level: int | None = Level


class EpisodeUpdate(BaseModel):
    start_level: int | None = Level
    end_level: int | None = Level
    worst_level: int | None = Level
    used_chat: bool | None = None
    used_grounding: bool | None = None
    place: Place | None = None
    sleep: Sleep | None = None
    coffee: bool | None = None
    note: str | None = Field(default=None, max_length=2000)
    finished: bool | None = None  # sets ended_at


class EpisodeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    started_at: datetime
    ended_at: datetime | None
    start_level: int | None
    end_level: int | None
    worst_level: int | None
    used_chat: bool
    used_grounding: bool
    crisis_shown: bool
    place: Place | None
    sleep: Sleep | None
    coffee: bool | None
    note: str | None
