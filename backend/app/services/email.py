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
        log.error("Email to %s failed (Gmail): %s: %s", to, type(error).__name__, error)


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
        response = getattr(error, "response", None)
        detail = f"{response.status_code} {response.text[:300]}" if response is not None else type(error).__name__
        log.error("Email to %s failed (Resend): %s", to, detail)


def _send_with_brevo(to: str, subject: str, text: str) -> None:
    try:
        response = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"api-key": settings.brevo_api_key},
            json={"sender": {"name": "Breathe With Me", "email": settings.brevo_sender},
                  "to": [{"email": to}], "subject": subject, "textContent": text},
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPError as error:
        response = getattr(error, "response", None)
        detail = f"{response.status_code} {response.text[:300]}" if response is not None else type(error).__name__
        log.error("Email to %s failed (Brevo): %s", to, detail)


def send_email(to: str, subject: str, text: str) -> None:
    if settings.brevo_api_key and settings.brevo_sender:
        _send_with_brevo(to, subject, text)
    elif settings.gmail_address and settings.gmail_app_password:
        _send_with_gmail(to, subject, text)
    elif settings.resend_api_key:
        _send_with_resend(to, subject, text)
    else:
        # no provider: print the email to the log instead
        log.warning("Email not sent (no email provider set). To: %s | %s\n%s", to, subject, text)
