import httpx
import pytest

from app.config import settings
from app.services import ai
from app.services.reply_check import (
    CALM_MESSAGE, CHAT_LIMIT_MESSAGE, MEDICINE_MESSAGE, check_reply,
)

GOOD_REPLY = "That sounds really frightening. Panic rises and then eases, so let's follow the circle slowly together."


@pytest.fixture()
def fake_ai(monkeypatch):
    monkeypatch.setattr(settings, "groq_api_key", "test-key")
    monkeypatch.setattr(settings, "groq_models", ["main-model", "backup-model"])
    monkeypatch.setattr(settings, "gemini_api_key", "")

    class Fake:
        calls: list[str] = []
        replies: dict = {"main-model": GOOD_REPLY, "backup-model": GOOD_REPLY}

    def call(provider, messages):
        Fake.calls.append(provider.model)
        Fake.messages = messages
        result = Fake.replies[provider.model]
        if isinstance(result, Exception):
            raise result
        return result

    Fake.calls = []
    monkeypatch.setattr(ai, "call_provider", call)
    return Fake


def send(client, message, history=None, level=7):
    r = client.post("/api/chat", json={"message": message, "history": history or [], "level": level})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.mark.parametrize("text", ["I want to die", "I can't go on", "I want to hurt myself"])
def test_crisis_opens_emergency_screen_and_never_calls_ai(client, fake_ai, text):
    out = send(client, text)
    assert out["kind"] == "crisis" and out["next_step"] == "urgent" and out["reply"] is None
    assert fake_ai.calls == []


def test_normal_message_gets_ai_reply_and_breathing(client, fake_ai):
    out = send(client, "my heart is very fast")
    assert out == {"kind": "reply", "reply": GOOD_REPLY, "emergency_note": False,
                   "next_step": "breathing", "source": "ai"}


@pytest.mark.parametrize("text, note", [
    ("my chest hurts", ai.MEDICAL_WORRY_NOTE),
    ("I don't want to die", ai.FEAR_OF_DYING_NOTE),
])
def test_worries_show_emergency_note_and_grounding(client, fake_ai, text, note):
    out = send(client, text)
    assert out["kind"] == "reply" and out["emergency_note"] is True and out["next_step"] == "grounding"
    assert note in fake_ai.messages[0]["content"]


def test_first_provider_fails_second_answers(client, fake_ai):
    fake_ai.replies = {"main-model": httpx.HTTPError("429 too many requests"), "backup-model": GOOD_REPLY}
    out = send(client, "my heart is very fast")
    assert out["reply"] == GOOD_REPLY and fake_ai.calls == ["main-model", "backup-model"]


def test_all_providers_fail_gives_fixed_calm_message(client, fake_ai):
    fake_ai.replies = {"main-model": httpx.TimeoutException("slow"), "backup-model": httpx.HTTPError("down")}
    out = send(client, "my heart is very fast")
    assert out["reply"] == CALM_MESSAGE and out["source"] == "fixed"


def test_no_keys_gives_fixed_calm_message(client, fake_ai, monkeypatch):
    monkeypatch.setattr(settings, "groq_api_key", "")
    out = send(client, "my heart is very fast")
    assert out["reply"] == CALM_MESSAGE and fake_ai.calls == []


def test_medicine_reply_is_replaced(client, fake_ai):
    fake_ai.replies = {"main-model": "You could take a pill to calm down.", "backup-model": GOOD_REPLY}
    out = send(client, "should I take a pill?")
    assert out["reply"] == MEDICINE_MESSAGE and out["source"] == "fixed"


@pytest.mark.parametrize("bad", [
    "Take a slow, deep breath in through your nose.",
    "Breathe in, hold for a moment, then breathe out.",
    "Breathe in for four counts and out for six.",
    "Don't worry, this is not a heart attack.",
    "It's just panic, you are safe.",
    "Everything will be fine, I promise.",
    "You have panic disorder.",
    "Panic often feels like dying, but it is just a wave that will pass.",
    "It's only anxiety.",
    "",
    "One. Two. Three. Four. Five. Six sentences is too many.",
    " ".join(["word"] * 46) + ".",
])
def test_reply_check_blocks_unsafe_or_long_replies(bad):
    assert check_reply(bad).ok is False


@pytest.mark.parametrize("good", [
    GOOD_REPLY,
    "A racing heart is common in panic. Let the feeling be there, and follow the circle slowly.",
    "That sounds scary. A racing heart and tight breathing are common in panic. They will pass. "
    "Let them be there. Watch the circle and breathe gently with it.",
])
def test_reply_check_allows_good_replies(good):
    assert check_reply(good).ok is True


def test_chat_ends_after_six_user_messages(client, fake_ai):
    history = [{"role": r, "content": "x"} for _ in range(6) for r in ("user", "assistant")]
    out = send(client, "and another thing", history=history)
    assert out["reply"] == CHAT_LIMIT_MESSAGE and fake_ai.calls == []


def test_ai_receives_only_instructions_level_and_messages(client, fake_ai):
    send(client, "my boss called me", level=4)
    sent = fake_ai.messages
    assert [m["role"] for m in sent] == ["system", "user"]
    assert "Never say \"deep breath\"" in sent[0]["content"]
    assert "The user rated the panic 4 out of 10." in sent[0]["content"]
    assert ai.MEDICAL_WORRY_NOTE not in sent[0]["content"]
    assert sent[-1] == {"role": "user", "content": "my boss called me"}


def test_empty_message_is_rejected(client):
    assert client.post("/api/chat", json={"message": ""}).status_code == 422
