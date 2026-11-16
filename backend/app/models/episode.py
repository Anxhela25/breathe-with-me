from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum, ForeignKey, SmallInteger, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import Place, Sleep


def _level_check(column: str) -> CheckConstraint:
    return CheckConstraint(f"{column} IS NULL OR {column} BETWEEN 1 AND 10", name=f"ck_{column}_1_10")


class Episode(Base):
    __tablename__ = "episodes"
    __table_args__ = (_level_check("start_level"), _level_check("end_level"), _level_check("worst_level"))

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    start_level: Mapped[int | None] = mapped_column(SmallInteger)  # first answer on breathing screen
    end_level: Mapped[int | None] = mapped_column(SmallInteger)    # check-in answer
    worst_level: Mapped[int | None] = mapped_column(SmallInteger)  # quick question 1

    used_chat: Mapped[bool] = mapped_column(Boolean, default=False)
    used_grounding: Mapped[bool] = mapped_column(Boolean, default=False)
    crisis_shown: Mapped[bool] = mapped_column(Boolean, default=False)

    # quick questions, all optional
    place: Mapped[Place | None] = mapped_column(Enum(Place, native_enum=False, length=20))
    sleep: Mapped[Sleep | None] = mapped_column(Enum(Sleep, native_enum=False, length=20))
    coffee: Mapped[bool | None] = mapped_column(Boolean)
    expected: Mapped[bool | None] = mapped_column(Boolean)  # false = came out of the blue
    with_someone: Mapped[bool | None] = mapped_column(Boolean)
    note: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="episodes")  # noqa: F821
