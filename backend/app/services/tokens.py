# Login tokens (RFC 9700):
# - access token (JWT, 1 hour) sent with every request. Can't be revoked, so it's short.
# - refresh token (90 days) only used to get a new pair. Each one works once (rotation).
#   If a used one comes back it was probably copied, so all tokens of the account are revoked.
# 90 days because people open the app when an attack comes, sometimes weeks apart,
# and they should never get logged out right then.
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.dates import as_utc
from app.models import RefreshToken, User
from app.schemas.user import TokenOut
from app.services.auth import create_token

log = logging.getLogger("breathe.auth")

# reused this soon after rotation = retry after a lost response, not theft
REUSE_GRACE = timedelta(seconds=60)


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()



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
    """Rotate a refresh token. None = the phone has to log in again."""
    now = datetime.now(timezone.utc)
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == _hash(raw)))
    if row is None:
        log.info("Refresh refused: unknown key")
        return None
    user = row.user
    if row.revoked_at is not None and row.replaced_by_id is None:
        # revoked by logout or password change, just log in again
        log.info("Refresh refused: the key of account %d was cancelled", user.id)
        return None
    if row.revoked_at is not None:
        if now - as_utc(row.revoked_at) >= REUSE_GRACE:
            # already used or revoked token came back, probably copied
            log.warning("Refresh key reused for account %d: every login of the account cancelled", user.id)
            revoke_all(db, user, now)
            db.commit()
            return None
        # the phone never got the response: revoke the one it missed and give a new pair
        log.info("Refresh key retried within the grace time for account %d", user.id)
        db.execute(update(RefreshToken).where(RefreshToken.id == row.replaced_by_id, RefreshToken.revoked_at.is_(None))
                   .values(revoked_at=now))
    elif as_utc(row.expires_at) <= now:
        log.info("Refresh refused: the key of account %d expired after %s unused", user.id, _lifetime())
        return None
    new_row, new_raw = _new_refresh(db, user, now)
    row.revoked_at = row.revoked_at or now
    row.replaced_by_id = new_row.id
    db.commit()
    return TokenOut(access_token=create_token(user), refresh_token=new_raw)


def revoke(db: Session, raw: str) -> None:
    """Logout: revoke this phone's token."""
    row = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == _hash(raw)))
    if row is not None and row.revoked_at is None:
        row.revoked_at = datetime.now(timezone.utc)
        db.commit()
        log.info("Logged out on one device for account %d", row.user_id)
