# Error reports to Sentry. Off when SENTRY_DSN is empty (local dev and tests).
# Nothing personal goes out: no request bodies, headers, cookies or local variables,
# and emails are masked in every message.
import re

import sentry_sdk

from app.config import settings

EMAIL = re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+")
# SQLAlchemy errors end with the query values, which can be an email or a password hash
SQL_PARAMS = re.compile(r"\[parameters: .*?\]", re.DOTALL)


def scrub(text: str) -> str:
    return EMAIL.sub("[email]", SQL_PARAMS.sub("[parameters]", text))


def _scrub_strings(value):
    if isinstance(value, str):
        return scrub(value)
    if isinstance(value, dict):
        return {k: _scrub_strings(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_scrub_strings(v) for v in value]
    return value


def before_send(event, hint):
    request = event.get("request")
    if request:
        # keep method and path, enough to find the endpoint
        event["request"] = {"method": request.get("method"), "url": request.get("url", "").split("?")[0]}
    event.pop("user", None)
    return _scrub_strings(event)


def before_breadcrumb(crumb, hint):
    message = crumb.get("message") or ""
    # this one quotes the model's answer, which could repeat what the user wrote
    if message.startswith("Risk check gave an unclear answer"):
        crumb["message"] = "Risk check gave an unclear answer"
    return _scrub_strings(crumb)


def init() -> None:
    if not settings.sentry_dsn:
        return
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment,
        send_default_pii=False,
        include_local_variables=False,
        max_request_body_size="never",
        traces_sample_rate=0,
        before_send=before_send,
        before_breadcrumb=before_breadcrumb,
    )
