# Crisis pause: after a clear crisis message the AI chat pauses for 24 hours on every device,
# and the first chat after it opens with a check-in.
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models import User
from tests.helpers import auth_header
from tests.test_chat import fake_ai  # noqa: F401  (fixture: no real AI calls)


def chat(client, message, headers=None, **extra):
    return client.post("/api/chat", json={"message": message, **extra}, headers=headers or {}).json()


def until(out):
    return datetime.fromisoformat(out["paused_until"].replace("Z", "+00:00"))


def test_crisis_pauses_for_24_hours_without_an_account(client, fake_ai):
    out = chat(client, "i want to kill myself")
    hours = (until(out) - datetime.now(timezone.utc)) / timedelta(hours=1)
    assert out["kind"] == "crisis" and 23.9 < hours <= 24


def test_crisis_pauses_the_account_on_the_server(client, fake_ai):
    headers = auth_header(client)
    chat(client, "i want to kill myself", headers)
    me = client.get("/api/me", headers=headers).json()
    assert me["chat_paused_until"] is not None and me["chat_checkin_due"] is True


def test_during_the_pause_the_ai_is_never_called(client, fake_ai, risk_check):
    headers = auth_header(client)
    chat(client, "i want to kill myself", headers)
    out = chat(client, "my heart is very fast", headers)
    assert out["kind"] == "paused" and out["reply"] is None and out["paused_until"] is not None
    assert fake_ai.calls == [] and risk_check.seen == []


def test_a_new_crisis_message_starts_the_pause_again(client, fake_ai):
    headers = auth_header(client)
    with SessionLocal() as db:
        user = db.query(User).one()
        user.chat_paused_until = datetime.now(timezone.utc) - timedelta(minutes=1)  # just ended
        db.commit()
    out = chat(client, "i want to kill myself", headers)
    assert out["kind"] == "crisis" and until(out) > datetime.now(timezone.utc) + timedelta(hours=23)


def test_after_the_pause_the_chat_works_and_the_check_in_is_done(client, fake_ai):
    headers = auth_header(client)
    chat(client, "i want to kill myself", headers)
    with SessionLocal() as db:
        user = db.query(User).one()
        user.chat_paused_until = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
    assert chat(client, "a bit better", headers)["kind"] == "reply"
    me = client.get("/api/me", headers=headers).json()
    assert me["chat_checkin_due"] is False


def test_an_invalid_token_still_gets_the_chat(client, fake_ai):
    out = chat(client, "my heart is very fast", {"Authorization": "Bearer not-a-token"})
    assert out["kind"] == "reply"


def test_yes_i_need_help_pauses_the_account(client):
    headers = auth_header(client)
    out = client.post("/api/chat/pause", headers=headers).json()
    me = client.get("/api/me", headers=headers).json()
    assert until(out) == until({"paused_until": me["chat_paused_until"]}) and me["chat_checkin_due"] is True


def test_pause_endpoint_needs_an_account(client):
    assert client.post("/api/chat/pause").status_code == 401
