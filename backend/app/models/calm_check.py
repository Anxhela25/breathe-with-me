from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, SmallInteger, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import CalmCheckSource


class CalmCheck(Base):
    # only result values are stored, never the camera video

    __tablename__ = "calm_checks"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    episode_id: Mapped[int | None] = mapped_column(ForeignKey("episodes.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    source: Mapped[CalmCheckSource] = mapped_column(Enum(CalmCheckSource, native_enum=False, length=20))
    level: Mapped[float] = mapped_column(Float)  # how well the rhythm followed the circle, 0-1; never shown
    message_key: Mapped[str] = mapped_column(String(40))  # e.g. "steady"
    heart_rate: Mapped[int | None] = mapped_column(SmallInteger)  # average beats per minute, shown in the result

    user: Mapped["User"] = relationship(back_populates="calm_checks")  # noqa: F821
