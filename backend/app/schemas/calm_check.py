from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import CalmCheckSource


class CalmCheckIn(BaseModel):
    source: CalmCheckSource
    level: float = Field(ge=0, le=1)
    message_key: Literal["steady", "gentle"]  # failed readings are never saved
    heart_rate: int | None = Field(default=None, ge=30, le=220)
    episode_id: int | None = None


class CalmCheckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    source: CalmCheckSource
    message_key: str
    heart_rate: int | None
    episode_id: int | None


class CalmBaselineOut(BaseModel):
    count: int
    baseline: float | None  # usual level from recent checks, None until there are some
