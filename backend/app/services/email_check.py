# Checks the email domain has MX records, catches typos like "gmail.con" and fake domains.
# Can't tell if the mailbox exists, only sending a code can.
import logging

from email_validator import EmailNotValidError, validate_email

from app.config import settings

log = logging.getLogger("breathe.email")


def email_problem(email: str) -> str | None:
    if not settings.check_email_domain:
        return None
    try:
        # DNS timeout: accept it, a slow network shouldn't block sign-up
        validate_email(email, check_deliverability=True, timeout=5)
    except EmailNotValidError as error:
        log.info("Email refused: %s", error)
        return "This email address can't receive emails. Please check it for typos."
    return None
