# Checks that the email's domain can receive mail (has mail servers in DNS), which catches typos like
# "gmail.con" and made-up domains. It can't tell whether the mailbox itself exists; only sending a
# code to it can.
import logging

from email_validator import EmailNotValidError, validate_email

from app.config import settings

log = logging.getLogger("breathe.email")


def email_problem(email: str) -> str | None:
    """A short, user-facing reason the email can't be used, or None if it looks deliverable."""
    if not settings.check_email_domain:
        return None
    try:
        # on a DNS timeout the address is accepted, so a slow network never blocks sign-up
        validate_email(email, check_deliverability=True, timeout=5)
    except EmailNotValidError as error:
        log.info("Email refused: %s", error)
        return "This email address can't receive emails. Please check it for typos."
    return None
