# Login keys, the way large apps do it (RFC 9700, OAuth 2.0 Security Best Current Practice):
# - a short access key (JWT, 1 hour) sent with every request; it can't be cancelled, so it lives briefly
# - a long refresh key (90 days, renewed on every use) that only gets new keys. Each one works once: using
#   it gives a new pair and cancels it ("rotation"). If a cancelled key comes back, someone copied it, and
#   every key of that account is cancelled.
# Why 90 days: people open a panic app when attacks come, often weeks apart, and must never be logged out at
# that moment; a phone that isn't used any more still logs out by itself.
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.models import RefreshToken, User
from app.schemas.user import TokenOut
from app.services.auth import create_token

log = logging.getLogger("breathe.auth")

# a key used again this soon after its swap is a retry (the reply was lost on a bad connection), not theft
REUSE_GRACE = timedelta(seconds=60)


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _aware(moment: datetime) -> datetime:
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)


def _lifetime() -> timedelta:
    if settings.refresh_token_minutes:
        return timedelta(minutes=settings.refresh_token_minutes)
    return timedelta(days=settings.refresh_token_days)


def _new_refresh(db: Session, user: User, now: datetime) -> tuple[RefreshToken, str]:
    raw = secrets.token_urlsafe(32)
    row = RefreshToken(user_id=user.id, token_hash=_hash(raw), expires_at=now + _lifetime())
    db.add(row)
    db.flush()
    return row, raw


def issue(db: Session, user: User) -> TokenOut:
    """A new pair of keys, at login, sign-up and password reset."""
    _, raw = _new_refresh(db, user, datetime.now(timezone.utc))
    db.commit()
    return TokenOut(access_token=create_token(user), refresh_token=raw)


def revoke_all(db: Session, user: User, now: datetime | None = None) -> None:
    """Logs out every device of this account."""
    db.execute(update(RefreshToken)
               .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
               .values(revoked_at=now or datetime.now(timezone.utc)))


def rotate(db: Session, raw: str) -> TokenOut | None:
    """Swaps a refresh key for a new pair. None: the key isn't valid any more, the phone must log in again."""
    now = datetime.now(timezone.utc)
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == _hash(raw)))
    if row is None:
        log.info("Refresh refused: unknown key")
        return None
    user = row.user
    if row.revoked_at is not None and row.replaced_by_id is None:
        # cancelled by logging out or a password change: this phone just logs in again
        log.info("Refresh refused: the key of account %d was cancelled", user.id)
        return None
    if row.revoked_at is not None:
        if now - _aware(row.revoked_at) >= REUSE_GRACE:
            # a key that was already used or cancelled came back: it was probably copied
            log.warning("Refresh key reused for account %d: every login of the account cancelled", user.id)
            revoke_all(db, user, now)
            db.commit()
            return None
        # the phone never got the answer: cancel the key it missed and give it a new one
        log.info("Refresh key retried within the grace time for account %d", user.id)
        db.execute(update(RefreshToken).where(RefreshToken.id == row.replaced_by_id, RefreshToken.revoked_at.is_(None))
                   .values(revoked_at=now))
    elif _aware(row.expires_at) <= now:
        log.info("Refresh refused: the key of account %d expired after %s unused", user.id, _lifetime())
        return None
    new_row, new_raw = _new_refresh(db, user, now)
    row.revoked_at = row.revoked_at or now
    row.replaced_by_id = new_row.id
    db.commit()
    return TokenOut(access_token=create_token(user), refresh_token=new_raw)


def revoke(db: Session, raw: str) -> None:
    """Logout: this phone's key stops working."""
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == _hash(raw)))
    if row is not None and row.revoked_at is None:
        row.revoked_at = datetime.now(timezone.utc)
        db.commit()
        log.info("Logged out on one device for account %d", row.user_id)
