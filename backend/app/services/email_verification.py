# Sign-up codes: proves the person owns the email before the account exists. Same rules as the
# password reset codes: short-lived, single use, stored as a hash, limited requests and guesses.
import hmac
import secrets
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import EmailVerification
from app.services.password_reset import CODE_MINUTES, MAX_ATTEMPTS, MAX_CODES_PER_HOUR, _hash, _now


def create_code(db: Session, email: str) -> str | None:
    """A new code to send, or None when this email asked for too many codes in the last hour."""
    recent = db.scalar(select(func.count()).select_from(EmailVerification).where(
        EmailVerification.email == email, EmailVerification.created_at > _now() - timedelta(hours=1)))
    if recent >= MAX_CODES_PER_HOUR:
        return None
    for old in db.scalars(select(EmailVerification).where(
            EmailVerification.email == email, EmailVerification.used_at.is_(None))):
        old.used_at = _now()  # only the newest code works
    code = f"{secrets.randbelow(10**6):06d}"
    db.add(EmailVerification(email=email, code_hash=_hash(code), expires_at=_now() + timedelta(minutes=CODE_MINUTES)))
    db.commit()
    return code


def use_code(db: Session, email: str, code: str) -> bool:
    """True if the code is right (and uses it up). Counts wrong attempts."""
    entry = db.scalar(select(EmailVerification).where(
        EmailVerification.email == email, EmailVerification.used_at.is_(None), EmailVerification.expires_at > _now(),
    ).order_by(EmailVerification.id.desc()))
    if entry is None:
        return False
    if not hmac.compare_digest(entry.code_hash, _hash(code.strip())):
        entry.attempts += 1
        if entry.attempts >= MAX_ATTEMPTS:
            entry.used_at = _now()
        db.commit()
        return False
    entry.used_at = _now()  # committed together with the new account
    return True


def email_text(code: str) -> str:
    return (
        f"Your Breathe With Me code is {code}.\n\n"
        f"Enter it in the app to finish creating your account. It expires in {CODE_MINUTES} minutes.\n\n"
        "If you didn't sign up, you can ignore this email. No account will be created."
    )
