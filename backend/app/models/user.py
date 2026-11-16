from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    # ISO code, used to pick emergency numbers
    country_code: Mapped[str | None] = mapped_column(String(2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # required at sign-up: the app is for adults, and health data needs explicit consent (GDPR art. 9)
    adult_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    health_data_consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # tokens issued before this are no longer accepted
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # cascade so "Delete my account" removes everything
    emergency_contacts: Mapped[list["EmergencyContact"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    episodes: Mapped[list["Episode"]] = relationship(  # noqa: F821
        back_populates="user", cascade="all, delete-orphan"
    )
    calm_checks: Mapped[list["CalmCheck"]] = relationship(  # noqa: F821
        back_populates="user", cascade="all, delete-orphan"
    )


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str] = mapped_column(String(40))

    user: Mapped[User] = relationship(back_populates="emergency_contacts")
