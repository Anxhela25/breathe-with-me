import httpx
import pytest

from app.config import settings
from app.services import ai
from app.services.reply_check import (
    CALM_MESSAGE, CHAT_LIMIT_MESSAGE, ENGLISH_ONLY_MESSAGE, MEDICINE_MESSAGE, check_reply,
)

REAL_CLASSIFY_RISK = ai.classify_risk  # conftest replaces it in every test

GOOD_REPLY = "That sounds really frightening. Panic rises and then eases, so let's follow the circle slowly together."


@pytest.fixture()
def fake_ai(monkeypatch):
    monkeypatch.setattr(settings, "groq_api_key", "test-key")
    monkeypatch.setattr(settings, "groq_models", ["main-model", "backup-model"])
    monkeypatch.setattr(settings, "gemini_api_key", "")

    class Fake:
        calls: list[str] = []
        replies: dict = {"main-model": GOOD_REPLY, "backup-model": GOOD_REPLY}

    def call(provider, messages, timeout=None):
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


@pytest.mark.parametrize("text", ["I'm going to die", "it is getting worse"])
def test_earlier_physical_symptom_keeps_medical_worry(client, fake_ai, text):
    history = [{"role": "user", "content": "I think I have chest pain"},
               {"role": "assistant", "content": "I hear your fear. Let's notice three things you can see."}]
    out = send(client, text, history)
    assert out["emergency_note"] is True and out["next_step"] == "grounding"
    assert ai.MEDICAL_WORRY_NOTE in fake_ai.messages[0]["content"]
    assert ai.FEAR_OF_DYING_NOTE not in fake_ai.messages[0]["content"]


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


# the messages from the screenshot that got through before
@pytest.mark.parametrize("text", ["i wantttt toooo dyeeeee", "i will kill myselve", "kms"])
def test_stretched_and_misspelled_crisis_never_calls_ai(client, fake_ai, text):
    assert send(client, text)["kind"] == "crisis" and fake_ai.calls == []


def test_ai_risk_check_asks_the_user(client, fake_ai, risk_check):
    risk_check.answer = True
    out = send(client, "nobody would even notice if i was gone")
    assert out["kind"] == "check" and out["reply"] is None and out["next_step"] == "urgent"


def test_ai_risk_check_reads_the_recent_conversation(client, fake_ai, risk_check):
    history = [{"role": "user", "content": "i cant do this anymore"}, {"role": "assistant", "content": "I'm here."}]
    send(client, "nobody would notice", history=history)
    assert risk_check.seen[-1] == ["i cant do this anymore", "nobody would notice"]


def test_risk_check_unavailable_asks_the_user(client, fake_ai, risk_check):
    risk_check.answer = None  # no provider answered in time: fail closed
    out = send(client, "my heart is very fast")
    assert out["kind"] == "check" and out["next_step"] == "urgent" and fake_ai.calls == []


def test_risk_check_unavailable_after_user_said_no_replies(client, fake_ai, risk_check):
    # asked once per chat: after "No, it's the panic", an outage doesn't ask again
    risk_check.answer = None
    r = client.post("/api/chat", json={"message": "my heart is very fast", "safe_confirmed": True})
    assert r.json()["kind"] == "reply"


def test_clear_risk_asks_even_after_user_said_no(client, fake_ai, risk_check):
    risk_check.answer = True
    r = client.post("/api/chat", json={"message": "nobody would notice if i was gone", "safe_confirmed": True})
    assert r.json()["kind"] == "check"


def test_non_english_message_without_risk_gets_fixed_message(client, fake_ai, risk_check):
    risk_check.lang = "sq"
    out = send(client, "me rreh zemra shume shpejt dhe kam frike")
    assert out == {"kind": "reply", "reply": ENGLISH_ONLY_MESSAGE, "emergency_note": False,
                   "next_step": "choose", "source": "fixed"}
    assert fake_ai.calls == []  # never sent to the reply model


def test_non_english_message_with_risk_asks_the_user(client, fake_ai, risk_check):
    risk_check.answer, risk_check.lang = True, "sq"
    out = send(client, "nuk e shoh me kuptimin e asgjeje")
    assert out["kind"] == "check" and fake_ai.calls == []


@pytest.mark.parametrize("text", ["po vdes", "ndihmë", "zemra ime shpejt"])
def test_short_messages_are_treated_as_english(client, fake_ai, risk_check, text):
    risk_check.lang = "sq"
    out = send(client, text)
    assert out["reply"] != ENGLISH_ONLY_MESSAGE and fake_ai.calls == ["main-model"]


def test_unsure_language_is_treated_as_english(client, fake_ai, risk_check):
    risk_check.lang = "unsure"
    out = send(client, "my heart is very fast and I feel weird")
    assert out["reply"] == GOOD_REPLY


@pytest.mark.parametrize("text", ["Dua të vdes", "s’dua të jetoj më", "mendoj për vetëvrasje", "do ta vras veten"])
def test_albanian_crisis_phrases_never_call_ai(client, fake_ai, text):
    assert send(client, text)["kind"] == "crisis" and fake_ai.calls == []


def test_non_english_ai_reply_is_replaced(client, fake_ai):
    fake_ai.replies = {"main-model": "Merr frymë ngadalë dhe ndiq rrethin në ekran.", "backup-model": GOOD_REPLY}
    out = send(client, "my heart is very fast")
    assert out["reply"] == CALM_MESSAGE and out["source"] == "fixed"


@pytest.mark.parametrize("answer, expected", [
    ('{"risk": "NO", "lang": "sq"}', ai.RiskResult(False, "sq")),
    ('Sure: {"risk": "yes", "lang": "EN"}', ai.RiskResult(True, "en")),
    ('{"risk": "NO", "lang": "albanian"}', ai.RiskResult(False, "unsure")),
    ('{"risk": "MAYBE", "lang": "en"}', None),
    ("NO", None),
    ("", None),
])
def test_parse_risk(answer, expected):
    assert ai.parse_risk(answer) == expected


class FakeClock:
    """time.monotonic for the ai module; every HTTP call 'takes' its full timeout and then times out."""

    def __init__(self, monkeypatch):
        self.now = 1000.0
        self.timeouts = []
        monkeypatch.setattr(ai.time, "monotonic", lambda: self.now)

        def slow_post(url, json, headers, timeout):
            self.timeouts.append(timeout)
            self.now += timeout
            raise httpx.TimeoutException("slow")
        monkeypatch.setattr(ai.httpx, "post", slow_post)


@pytest.fixture()
def three_providers(monkeypatch):
    monkeypatch.setattr(settings, "groq_api_key", "test-key")
    monkeypatch.setattr(settings, "groq_models", ["main-model", "backup-model"])
    monkeypatch.setattr(settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(settings, "ai_attempt_seconds", 4.0)
    monkeypatch.setattr(settings, "ai_total_seconds", 10.0)


def test_each_attempt_has_4_seconds_and_the_reply_10_in_total(monkeypatch, three_providers):
    clock = FakeClock(monkeypatch)
    assert ai.generate_reply([{"role": "user", "content": "hi"}], None) is None
    assert clock.timeouts == [4.0, 4.0, 2.0]  # the third model only gets what is left


def test_risk_check_and_reply_share_one_deadline(monkeypatch, three_providers):
    clock = FakeClock(monkeypatch)
    deadline = ai.Deadline()
    assert REAL_CLASSIFY_RISK(["hi"], deadline) is None
    assert ai.generate_reply([{"role": "user", "content": "hi"}], None, deadline=deadline) is None
    assert clock.timeouts == [4.0, 4.0, 2.0]  # no time left for the reply


def test_all_models_failing_asks_the_user(client, monkeypatch, three_providers):
    # with no answer from any model the risk check fails closed, and nothing waits longer than 10 s
    monkeypatch.setattr(ai, "classify_risk", REAL_CLASSIFY_RISK)  # not the conftest fake
    clock = FakeClock(monkeypatch)
    out = send(client, "my heart is very fast")
    assert out["kind"] == "check" and out["next_step"] == "urgent"
    assert sum(clock.timeouts) <= 10.0


def test_all_models_failing_after_user_said_no_gives_calm_message(client, monkeypatch, three_providers):
    monkeypatch.setattr(ai, "classify_risk", REAL_CLASSIFY_RISK)
    FakeClock(monkeypatch)
    r = client.post("/api/chat", json={"message": "my heart is very fast", "safe_confirmed": True})
    assert r.json()["reply"] == CALM_MESSAGE and r.json()["source"] == "fixed"


@pytest.mark.parametrize("reply", [
    "I can't help with this. You need professional support right now.",
    "I'm not a therapist. Please reach out to a trusted person.",
    "Please contact a crisis line in your area.",
])
def test_crisis_like_ai_reply_asks_the_user(client, fake_ai, reply):
    fake_ai.replies = {"main-model": reply, "backup-model": GOOD_REPLY}
    out = send(client, "everything is too much")
    assert out["kind"] == "check" and out["reply"] is None
