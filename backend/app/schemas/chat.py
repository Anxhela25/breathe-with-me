from typing import Literal

from pydantic import BaseModel, Field


class ChatLine(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=2000)


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatLine] = Field(default_factory=list, max_length=20)
    level: int | None = Field(default=None, ge=1, le=10)


class ChatOut(BaseModel):
    kind: Literal["crisis", "check", "reply"]  # check: possible crisis, the app asks the user
    reply: str | None
    emergency_note: bool
    next_step: Literal["breathing", "grounding", "urgent"]
    source: Literal["ai", "fixed"]
