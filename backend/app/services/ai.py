# Groq and Gemini both expose an OpenAI-compatible API, so one request format covers both.
# The prompt follows docs/clinical-decisions.md and still needs clinical review.
import logging
import time
from dataclasses import dataclass, field

import httpx

from app.config import settings

log = logging.getLogger("breathe.ai")

SYSTEM_PROMPT = """\
You are the calm support companion inside "Breathe With Me", a self-help app for moments of panic.
You are an AI, not a person and not a therapist. The user may be in the middle of a panic attack,
so they can only read a little.

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


# The app shows its own emergency note for both, so the AI shouldn't repeat it.
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
    # everything in one system message, Gemini ignores additional ones
    instructions = SYSTEM_PROMPT
    if level is not None:
        instructions += f"\nThe user rated the panic {level} out of 10."
    if worry in WORRY_NOTES:
        instructions += f"\n{WORRY_NOTES[worry]}"
    messages = [{"role": "system", "content": instructions}]
    messages.extend({"role": m["role"], "content": m["content"]} for m in history[-8:])
    return messages


def call_provider(provider: Provider, messages: list[dict]) -> str:
    body = {"model": provider.model, "messages": messages, "max_tokens": 200, "temperature": 0.4, **provider.extra}
    response = httpx.post(
        f"{provider.base_url}/chat/completions",
        json=body,
        headers={"Authorization": f"Bearer {provider.api_key}"},
        timeout=settings.ai_timeout_seconds,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"] or ""


def generate_reply(history: list[dict], level: int | None, worry: str | None = None) -> tuple[str, str] | None:
    """Returns (reply, "provider/model"), or None if every provider failed."""
    messages = build_messages(history, level, worry)
    for i, provider in enumerate(providers()):
        start = time.monotonic()
        try:
            reply = call_provider(provider, messages)
        except Exception as error:  # noqa: BLE001
            log.warning("AI provider failed: %s/%s (%s)", provider.name, provider.model, type(error).__name__)
            continue
        log.info(
            "AI reply from %s/%s in %.2fs%s", provider.name, provider.model,
            time.monotonic() - start, " (fallback used)" if i > 0 else "",
        )
        return reply, f"{provider.name}/{provider.model}"
    log.error("All AI providers failed or none configured; using the fixed calm message.")
    return None
