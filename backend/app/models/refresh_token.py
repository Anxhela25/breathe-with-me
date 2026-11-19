from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RefreshToken(Base):
    """The long key (90 days, renewed on every use) that keeps a phone logged in. Only its SHA-256 hash is
    stored, so a database leak gives no working keys. Each key is used once: using it gives a new one."""

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # set when the key is swapped for a new one (rotated), on logout, or on a password change
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # the key it was swapped for; empty when it was cancelled instead
    replaced_by_id: Mapped[int | None] = mapped_column(ForeignKey("refresh_tokens.id", ondelete="SET NULL"))

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")  # noqa: F821
