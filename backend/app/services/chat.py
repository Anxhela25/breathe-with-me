import logging
from dataclasses import dataclass

from app.config import settings
from app.services import ai
from app.services.reply_check import CALM_MESSAGE, CHAT_LIMIT_MESSAGE, ENGLISH_ONLY_MESSAGE, check_reply
from app.services.safety import SafetyLevel, check_message

log = logging.getLogger("breathe.chat")

# shorter messages are treated as English: too little text to tell the language reliably
MIN_WORDS_FOR_LANGUAGE = 4


@dataclass
class ChatResult:
    # "crisis": clear crisis, open urgent help. "check": possible crisis, ask the user first.
    kind: str
    reply: str | None = None
    emergency_note: bool = False
    # "choose": show breathing, grounding and urgent help, e.g. after the English-only message
    next_step: str = "breathing"
    source: str = "fixed"  # "ai" or "fixed"


def treat_as_english(message: str, lang: str) -> bool:
    return lang in ("en", "unsure") or len(message.split()) < MIN_WORDS_FOR_LANGUAGE


def run_chat(message: str, history: list[dict], level: int | None, safe_confirmed: bool = False) -> ChatResult:
    # Layer 1: rules. Clear crisis messages never reach the AI.
    safety = check_message(message)
    if safety.level is SafetyLevel.crisis:
        return ChatResult(kind="crisis", next_step="urgent")
    worry = safety.level.value if safety.level in (SafetyLevel.medical_worry, SafetyLevel.fear_of_dying) else None
    # once a physical symptom is mentioned, the rest of the chat is a medical worry, so the AI never
    # links anything to panic (e.g. "chest pain" then "I'm going to die")
    earlier = (check_message(m["content"]).level for m in history if m["role"] == "user")
    if any(level is SafetyLevel.medical_worry for level in earlier):
        worry = SafetyLevel.medical_worry.value
    medical_worry = worry is not None
    next_step = "grounding" if medical_worry else "breathing"

    user_messages = [m["content"] for m in history if m["role"] == "user"] + [message]
    if len(user_messages) > settings.chat_max_user_messages:
        return ChatResult(kind="reply", reply=CHAT_LIMIT_MESSAGE, emergency_note=medical_worry, next_step="breathing")

    # Layer 2: an AI risk check on the meaning (typos, slang, any language). It runs before the reply,
    # because a message that isn't in English must not reach the reply model.
    deadline = ai.Deadline()
    risk = ai.classify_risk(user_messages, deadline)
    if risk is None and not safe_confirmed:
        # fail closed: no clear answer is treated as possible risk. Asked once per chat, so an outage
        # doesn't ask after every message; the user's "No" is sent back as safe_confirmed.
        log.warning("Risk check unavailable; asking the user")
        return ChatResult(kind="check", next_step="urgent")
    if risk is not None and risk.risk:
        return ChatResult(kind="check", next_step="urgent")
    if risk is not None and not treat_as_english(message, risk.lang):
        log.info("Message in '%s'; English-only message shown", risk.lang)
        return ChatResult(kind="reply", reply=ENGLISH_ONLY_MESSAGE, emergency_note=medical_worry, next_step="choose")

    answer = ai.generate_reply([*history, {"role": "user", "content": message}], level, worry, deadline)
    if answer is None:
        return ChatResult(kind="reply", reply=CALM_MESSAGE, emergency_note=medical_worry, next_step=next_step)

    # Layer 3: the reply check. A crisis-like reply means the AI noticed something; ask the user.
    reply, model = answer
    checked = check_reply(reply)
    if not checked.ok:
        log.warning("AI reply replaced: %s (from %s)", checked.reason, model)
    if checked.crisis:
        return ChatResult(kind="check", next_step="urgent")
    return ChatResult(
        kind="reply",
        reply=checked.text,
        emergency_note=medical_worry,
        next_step=next_step,
        source="ai" if checked.ok else "fixed",
    )
