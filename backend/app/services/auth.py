import logging
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

_bearer = HTTPBearer(auto_error=False)
log = logging.getLogger("breathe.auth")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def _password_version(user: User) -> float:
    return round(user.password_changed_at.timestamp(), 3) if user.password_changed_at else 0


def create_token(user: User) -> str:
    # the short access key; services/tokens.py hands it out together with the refresh key
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    # "pv" ties the token to the current password, so changing it signs out other devices
    claims = {"sub": str(user.id), "pv": _password_version(user), "exp": expire}
    return jwt.encode(claims, settings.jwt_secret, algorithm="HS256")


def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User | None:
    """The logged-in user, or None: for endpoints that also work without an account."""
    if creds is None:
        return None
    try:
        return get_current_user(creds, db)
    except HTTPException:
        return None


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Please log in again.")
    if creds is None:
        log.info("No login token sent")
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=["HS256"])
        user = db.get(User, int(payload["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError) as error:
        # ExpiredSignatureError is the usual one; InvalidSignatureError means JWT_SECRET changed
        log.info("Login token rejected: %s", type(error).__name__)
        raise unauthorized
    if user is None:
        log.info("Login token rejected: account %s no longer exists", payload["sub"])
        raise unauthorized
    if payload.get("pv", 0) != _password_version(user):
        log.info("Login token rejected: account %d changed its password since", user.id)
        raise unauthorized
    return user
