from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RefreshToken(Base):
    # only the sha256 hash is stored, each token works once and is replaced on use

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # set on rotation, logout or password change
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # the token it was replaced by (empty if revoked)
    replaced_by_id: Mapped[int | None] = mapped_column(ForeignKey("refresh_tokens.id", ondelete="SET NULL"))

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")  # noqa: F821
