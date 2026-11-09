from pydantic import BaseModel, Field

from app.services.safety import SafetyLevel


class SafetyCheckIn(BaseModel):
    text: str = Field(max_length=2000)


class SafetyCheckOut(BaseModel):
    level: SafetyLevel
