# Password rules follow NIST SP 800-63B-4: length over composition, and no common or leaked passwords.
import hashlib
import logging
from functools import cache
from pathlib import Path

import httpx

from app.config import settings

log = logging.getLogger("breathe.passwords")

MIN_LENGTH = 12
MAX_LENGTH = 64
_COMMON_FILE = Path(__file__).resolve().parent.parent / "data" / "common_passwords.txt"


@cache
def _common_passwords() -> frozenset[str]:
    return frozenset(line.strip().lower() for line in _COMMON_FILE.read_text().splitlines() if line.strip())


def _is_breached(password: str) -> bool:
    # k-anonymity: only the first 5 characters of the SHA-1 hash leave the server
    digest = hashlib.sha1(password.encode()).hexdigest().upper()
    try:
        response = httpx.get(f"https://api.pwnedpasswords.com/range/{digest[:5]}", timeout=3,
                             headers={"Add-Padding": "true"})
        response.raise_for_status()
    except httpx.HTTPError as error:
        log.warning("Breached-password check unavailable (%s); skipped", type(error).__name__)
        return False
    return any(line.split(":")[0] == digest[5:] and not line.endswith(":0") for line in response.text.splitlines())


def password_problem(password: str, email: str) -> str | None:
    """A short, user-facing reason the password can't be used, or None if it is fine."""
    if len(password) < MIN_LENGTH:
        return f"Use at least {MIN_LENGTH} characters. A short phrase is easy to remember."
    if len(password) > MAX_LENGTH or len(password.encode()) > 72:  # bcrypt reads at most 72 bytes
        return f"Use at most {MAX_LENGTH} characters."
    lowered = password.lower()
    if lowered in _common_passwords() or len(set(lowered)) < 4:
        return "This password is too common. Try a few unrelated words."
    name = email.split("@")[0].lower()
    if (len(name) >= 4 and name in lowered) or "breathe" in lowered:
        return "Don't use your email name or the app's name in the password."
    if settings.check_breached_passwords and _is_breached(password):
        return "This password has appeared in a data breach. Please choose a different one."
    return None
