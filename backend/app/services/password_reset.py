# Follows the OWASP Forgot Password Cheat Sheet: same answer whether or not the account exists,
# short-lived single-use codes stored as a hash, and limits on requests and guesses.
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import PasswordReset, User

CODE_MINUTES = 15
MAX_ATTEMPTS = 5
MAX_CODES_PER_HOUR = 3


def _hash(code: str) -> str:
    return hmac.new(settings.jwt_secret.encode(), code.encode(), hashlib.sha256).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_code(db: Session, email: str) -> tuple[str, str] | None:
    """Returns (email, code) to send, or None when nothing should be sent."""
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None:
        return None
    recent = db.scalar(select(func.count()).select_from(PasswordReset).where(
        PasswordReset.user_id == user.id, PasswordReset.created_at > _now() - timedelta(hours=1)))
    if recent >= MAX_CODES_PER_HOUR:
        return None
    for old in db.scalars(select(PasswordReset).where(PasswordReset.user_id == user.id, PasswordReset.used_at.is_(None))):
        old.used_at = _now()  # only the newest code works
    code = f"{secrets.randbelow(10**6):06d}"
    db.add(PasswordReset(user_id=user.id, code_hash=_hash(code), expires_at=_now() + timedelta(minutes=CODE_MINUTES)))
    db.commit()
    return user.email, code


def check_code(db: Session, email: str, code: str) -> User | None:
    """The user if the code is right; counts wrong attempts. Does not use up the code."""
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None:
        return None
    reset = db.scalar(select(PasswordReset).where(
        PasswordReset.user_id == user.id, PasswordReset.used_at.is_(None), PasswordReset.expires_at > _now(),
    ).order_by(PasswordReset.id.desc()))
    if reset is None:
        return None
    if not hmac.compare_digest(reset.code_hash, _hash(code.strip())):
        reset.attempts += 1
        if reset.attempts >= MAX_ATTEMPTS:
            reset.used_at = _now()
        db.commit()
        return None
    return user


def finish(db: Session, user: User, password_hash: str) -> None:
    now = _now()
    user.password_hash = password_hash
    user.password_changed_at = now  # signs out every other device
    for reset in db.scalars(select(PasswordReset).where(PasswordReset.user_id == user.id, PasswordReset.used_at.is_(None))):
        reset.used_at = now
    db.commit()


def email_text(code: str) -> str:
    return (
        f"Your Breathe With Me code is {code}.\n\n"
        f"Enter it in the app to choose a new password. It expires in {CODE_MINUTES} minutes and works once.\n\n"
        "If you didn't ask for this, you can ignore this email. Your password has not changed."
    )
