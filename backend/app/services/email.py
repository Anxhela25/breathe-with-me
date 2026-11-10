import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.config import settings

log = logging.getLogger("breathe.email")


def _send_with_gmail(to: str, subject: str, text: str) -> None:
    message = EmailMessage()
    message["From"] = f"Breathe With Me <{settings.gmail_address}>"
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10) as server:
            # Google shows app passwords with spaces
            server.login(settings.gmail_address, settings.gmail_app_password.replace(" ", ""))
            server.send_message(message)
    except (smtplib.SMTPException, OSError) as error:
        log.error("Email to %s failed: %s", to, error)


def _send_with_resend(to: str, subject: str, text: str) -> None:
    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={"from": settings.email_from, "to": [to], "subject": subject, "text": text},
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPError as error:
        log.error("Email to %s failed: %s", to, getattr(error, "response", None) and error.response.text)


def send_email(to: str, subject: str, text: str) -> None:
    if settings.gmail_address and settings.gmail_app_password:
        _send_with_gmail(to, subject, text)
    elif settings.resend_api_key:
        _send_with_resend(to, subject, text)
    else:
        # development without a provider: show the email in the server log instead of sending it
        log.warning("Email not sent (no email provider set). To: %s | %s\n%s", to, subject, text)
