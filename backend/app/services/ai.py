# Groq and Gemini both have an OpenAI compatible API, so one request format works for both.
# Prompt is based on docs/clinical-decisions.md, still needs clinical review.
import json
import logging
import re
import time
from dataclasses import dataclass, field

import httpx

from app.config import settings

log = logging.getLogger("breathe.ai")

SYSTEM_PROMPT = """\
You are the calm support companion inside "Breathe With Me", a self-help app for moments of panic.
You are an AI, not a person and not a therapist. The user may be in the middle of a panic attack,
so they can only read a little.

Always reply in English, even if the user writes in another language.

How to reply:
- Write 1 or 2 short, simple sentences, at most 40 words. Plain words. No lists, no emojis.
- First, acknowledge how the user feels in a few words.
- Where it fits, explain gently that strong body sensations, like a racing heart or feeling short
  of breath, are common in panic, and that panic rises, peaks and then eases.
- Encourage the user to let the sensations be there and ride them out, rather than fight them.
- End by guiding the user back to the breathing circle on the screen, or to the grounding exercise
  (noticing things they can see, touch and hear).

Breathing:
- Only ask for slow, gentle breathing that follows the circle on the screen.
- Never say "deep breath". Never ask the user to hold their breath. Never give your own counts.

Never:
- Diagnose, or say what a symptom means medically. Never say that something is or is not a heart
  attack or any other condition.
- Give medical or medication advice. If asked about medication, say you can't advise on medicine
  and suggest a doctor or pharmacist.
- Promise safety or outcomes, such as "you are safe", "everything is fine" or "nothing bad will happen".
- Pretend to be a human or a professional.
- Discuss self-harm or suicide.

If the user mentions chest pain, fainting, or feeling that something is physically wrong, never say it is
panic. The app shows its own note about calling emergency services.
"""


@dataclass
class Provider:
    name: str
    base_url: str
    model: str
    api_key: str = field(repr=False)
    extra: dict = field(default_factory=dict)


GROQ_URL = "https://api.groq.com/openai/v1"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai"


def providers() -> list[Provider]:
    result: list[Provider] = []
    if settings.groq_api_key:
        for model in settings.groq_models:
            # no long reasoning, keeps replies fast
            extra = {"reasoning_effort": "low"} if "gpt-oss" in model else {"reasoning_effort": "none"}
            result.append(Provider("groq", GROQ_URL, model, settings.groq_api_key, extra))
    if settings.gemini_api_key:
        # reasoning tokens count towards max_tokens
        extra = {"reasoning_effort": "minimal", "max_tokens": 1024}
        result.append(Provider("gemini", GEMINI_URL, settings.gemini_model, settings.gemini_api_key, extra))
    return result


# the app shows its own emergency note for these, the AI shouldn't repeat it
MEDICAL_WORRY_NOTE = (
    "The user mentions a physical symptom that could be a medical emergency. Do not say it is panic, "
    "anxiety or a wave, and do not say it will pass. Acknowledge the fear in a few words and guide them "
    "to grounding. The app already shows a note about calling emergency services, so do not repeat it."
)
FEAR_OF_DYING_NOTE = (
    "The user is afraid of dying. Acknowledge the fear, then gently say that a strong fear of dying is a "
    "common feeling during panic. Do not say they are safe, not dying, or that nothing is wrong. Invite "
    "them to let the feeling be there, and guide them to grounding. The app already shows a note about "
    "calling emergency services, so do not repeat it."
)
WORRY_NOTES = {"medical_worry": MEDICAL_WORRY_NOTE, "fear_of_dying": FEAR_OF_DYING_NOTE}


def build_messages(history: list[dict], level: int | None, worry: str | None = None) -> list[dict]:
    # Gemini ignores extra system messages, so everything goes in one
    instructions = SYSTEM_PROMPT
    if level is not None:
        instructions += f"\nThe user rated the panic {level} out of 10."
    if worry in WORRY_NOTES:
        instructions += f"\n{WORRY_NOTES[worry]}"
    messages = [{"role": "system", "content": instructions}]
    messages.extend({"role": m["role"], "content": m["content"]} for m in history[-8:])
    return messages


class Deadline:

    MIN_SECONDS = 0.5

    def __init__(self, seconds: float | None = None):
        self.end = time.monotonic() + (settings.ai_total_seconds if seconds is None else seconds)

    def next_timeout(self) -> float | None:
        left = self.end - time.monotonic()
        return None if left < self.MIN_SECONDS else min(settings.ai_attempt_seconds, left)


def _post(provider: Provider, body: dict, timeout: float) -> str:
    response = httpx.post(
        f"{provider.base_url}/chat/completions",
        json=body,
        headers={"Authorization": f"Bearer {provider.api_key}"},
        timeout=timeout,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"] or ""


def _why(error: Exception) -> str:
    if isinstance(error, httpx.HTTPStatusError):
        return f"HTTP {error.response.status_code}: {error.response.text[:200]}"
    if isinstance(error, httpx.TimeoutException):
        return "timed out"
    return f"{type(error).__name__}: {error}"


def _no_providers() -> bool:
    if providers():
        return False
    log.error("No AI provider set: add GROQ_API_KEY or GEMINI_API_KEY to backend/.env")
    return True


def call_provider(provider: Provider, messages: list[dict], timeout: float) -> str:
    body = {"model": provider.model, "messages": messages, "max_tokens": 200, "temperature": 0.4, **provider.extra}
    return _post(provider, body, timeout)


RISK_PROMPT = """\
You are a safety classifier for a panic-attack self-help app. Read the user's recent messages.
risk is YES if they express any wish to die, suicidal thoughts or plans, wanting to hurt themselves,
or not wanting to live, even when misspelled, in slang, hinted at, or in any language.
If it could mean not wanting to live, risk is YES too: for example "I don't want to breathe anymore",
"I want to disappear", "I can't do this anymore", "no one would miss me", above all together with
loneliness or hopelessness. A YES only makes the app ask whether they are safe, so when unsure, say YES.
risk is NO if they only express fear of dying or of a physical symptom (for example "I'm going to die",
"I don't want to die", "my heart will stop"), which is common during panic, or anything else.
english is YES if the LAST message is written in English (typos, slang and texting style still count
as English), and NO if it is written in another language.
Reply with only this JSON and nothing else: {"risk": "YES" or "NO", "english": "YES" or "NO"}"""


@dataclass
class RiskResult:
    risk: bool
    # None if the model didn't say. yes/no works better than asking for a language code,
    # small models got short texts wrong ("Ti spo m kupton" came back as "unsure")
    english: bool | None


def parse_risk(answer: str) -> RiskResult | None:
    match = re.search(r"\{.*\}", answer, re.S)
    try:
        data = json.loads(match.group(0)) if match else None
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    risk = str(data.get("risk", "")).strip().upper()
    if risk not in ("YES", "NO"):
        return None
    english = str(data.get("english", "")).strip().upper()
    return RiskResult(risk == "YES", {"YES": True, "NO": False}.get(english))


def _ask_classifier(provider: Provider, messages: list[dict], timeout: float) -> str:
    body = {"model": provider.model, "messages": messages, "temperature": 0,
            "max_tokens": 300, **provider.extra}  # reasoning models need room before the answer
    return _post(provider, body, timeout)


def classify_risk(user_messages: list[str], deadline: Deadline | None = None) -> RiskResult | None:
    """Risk check on the last 3 user messages + is the newest one English. None if no clear answer in time.
    Catches what safety.py can't: hints, slang, other languages."""
    if _no_providers():
        return None
    deadline = deadline or Deadline()
    recent = "\n".join(f"- {m}" for m in user_messages[-3:])
    messages = [{"role": "system", "content": RISK_PROMPT}, {"role": "user", "content": recent}]
    for provider in providers():
        timeout = deadline.next_timeout()
        if timeout is None:
            log.warning("Risk check ran out of time before %s/%s", provider.name, provider.model)
            break
        start = time.monotonic()
        try:
            answer = _ask_classifier(provider, messages, timeout)
        except Exception as error:  # noqa: BLE001
            log.warning("Risk check failed: %s/%s after %.2fs (%s)", provider.name, provider.model,
                        time.monotonic() - start, _why(error))
            continue
        result = parse_risk(answer)
        if result is not None:
            log.debug("Risk check from %s/%s in %.2fs: %s", provider.name, provider.model,
                      time.monotonic() - start, result)
            return result
        log.warning("Risk check gave an unclear answer from %s/%s: %r", provider.name, provider.model, answer[:120])
    log.error("Risk check: no provider answered clearly")
    return None


def generate_reply(history: list[dict], level: int | None, worry: str | None = None,
                   deadline: Deadline | None = None) -> tuple[str, str] | None:
    """(reply, "provider/model"), or None if all providers failed or time ran out."""
    if _no_providers():
        return None
    deadline = deadline or Deadline()
    messages = build_messages(history, level, worry)
    for i, provider in enumerate(providers()):
        timeout = deadline.next_timeout()
        if timeout is None:
            log.warning("AI reply ran out of time before %s/%s", provider.name, provider.model)
            break
        start = time.monotonic()
        try:
            reply = call_provider(provider, messages, timeout)
        except Exception as error:  # noqa: BLE001
            log.warning("AI reply failed: %s/%s after %.2fs (%s)", provider.name, provider.model,
                        time.monotonic() - start, _why(error))
            continue
        log.info(
            "AI reply from %s/%s in %.2fs%s", provider.name, provider.model,
            time.monotonic() - start, " (fallback used)" if i > 0 else "",
        )
        return reply, f"{provider.name}/{provider.model}"
    log.error("AI reply: every provider failed; the fixed calm message is shown")
    return None
