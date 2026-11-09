from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ChatRole, MessageLabel


class ChatMessage(Base):
    # text is cleared after the session if the user doesn't keep chats; label is kept for patterns

    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    episode_id: Mapped[int] = mapped_column(ForeignKey("episodes.id", ondelete="CASCADE"), index=True)
    role: Mapped[ChatRole] = mapped_column(Enum(ChatRole, native_enum=False, length=20))
    text: Mapped[str | None] = mapped_column(Text)
    label: Mapped[MessageLabel | None] = mapped_column(Enum(MessageLabel, native_enum=False, length=20))
    provider: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    episode: Mapped["Episode"] = relationship(back_populates="messages")  # noqa: F821
