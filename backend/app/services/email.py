import logging

import httpx

from app.config import settings

log = logging.getLogger("breathe.email")


def send_email(to: str, subject: str, text: str) -> None:
    if not settings.resend_api_key:
        # development without a key: show the email in the server log instead of sending it
        log.warning("Email not sent (no RESEND_API_KEY). To: %s | %s\n%s", to, subject, text)
        return
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
