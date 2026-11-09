from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import Place, Sleep

Level = Field(default=None, ge=1, le=10)


class EpisodeCreate(BaseModel):
    start_level: int | None = Level
    started_at: datetime | None = None  # sessions are saved at the end, so the app sends the real start

    @field_validator("started_at")
    @classmethod
    def not_in_future(cls, value: datetime | None) -> datetime | None:
        if value is not None and value > datetime.now(timezone.utc) + timedelta(minutes=5):
            raise ValueError("started_at cannot be in the future")
        return value


class EpisodeUpdate(BaseModel):
    start_level: int | None = Level
    end_level: int | None = Level
    worst_level: int | None = Level
    used_chat: bool | None = None
    used_grounding: bool | None = None
    crisis_shown: bool | None = None
    place: Place | None = None
    sleep: Sleep | None = None
    coffee: bool | None = None
    expected: bool | None = None
    with_someone: bool | None = None
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
    expected: bool | None
    with_someone: bool | None
    note: str | None
