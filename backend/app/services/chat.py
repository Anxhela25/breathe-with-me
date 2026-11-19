import logging
from dataclasses import dataclass

from app.config import settings
from app.services import ai
from app.services.reply_check import CALM_MESSAGE, CHAT_LIMIT_MESSAGE, ENGLISH_ONLY_MESSAGE, check_reply
from app.services.safety import SafetyLevel, check_message

# logs say what happened, never what the user wrote
log = logging.getLogger("breathe.chat")

# shorter messages count as English: too little text to judge
MIN_WORDS_FOR_LANGUAGE = 4


@dataclass
class ChatResult:
    # "crisis": clear crisis, open urgent help. "check": possible crisis, ask the user first.
    kind: str
    reply: str | None = None
    emergency_note: bool = False
    # "choose": breathing, grounding and urgent help, after the English-only message
    next_step: str = "breathing"
    source: str = "fixed"  # "ai" or "fixed"


def treat_as_english(message: str, english: bool | None) -> bool:
    # unsure (None) counts as English too
    return english is not False or len(message.split()) < MIN_WORDS_FOR_LANGUAGE


def _possible_crisis(safe_confirmed: bool) -> ChatResult:
    # she already answered "No, it's the panic" once in this chat: a second sign is treated as a clear crisis
    if safe_confirmed:
        log.info("Second possible crisis after the user said no: treated as a crisis")
        return ChatResult(kind="crisis", next_step="urgent")
    log.info("Possible crisis: asking the user if they are safe")
    return ChatResult(kind="check", next_step="urgent")


def run_chat(message: str, history: list[dict], level: int | None, safe_confirmed: bool = False) -> ChatResult:
    # Layer 1: rules. Clear crisis messages never reach the AI.
    safety = check_message(message)
    if safety.level is SafetyLevel.crisis:
        log.info("Crisis rule matched: urgent help opened, AI not called")
        return ChatResult(kind="crisis", next_step="urgent")
    worry = safety.level.value if safety.level in (SafetyLevel.medical_worry, SafetyLevel.fear_of_dying) else None
    # after "chest pain", "I'm going to die" must not be called panic either: the worry stays for the whole chat
    earlier = (check_message(m["content"]).level for m in history if m["role"] == "user")
    if any(level is SafetyLevel.medical_worry for level in earlier):
        worry = SafetyLevel.medical_worry.value
    medical_worry = worry is not None
    next_step = "grounding" if medical_worry else "breathing"

    user_messages = [m["content"] for m in history if m["role"] == "user"] + [message]
    if len(user_messages) > settings.chat_max_user_messages:
        log.info("Chat limit of %d messages reached", settings.chat_max_user_messages)
        return ChatResult(kind="reply", reply=CHAT_LIMIT_MESSAGE, emergency_note=medical_worry, next_step="breathing")

    # Layer 2: the AI risk check. It runs before the reply, so a message that isn't in English never
    # reaches the reply model.
    deadline = ai.Deadline()
    risk = ai.classify_risk(user_messages, deadline)
    if risk is None and not safe_confirmed:
        # no answer counts as possible risk. Only once per chat though: after her "No" the app sends
        # safe_confirmed, so an outage doesn't ask after every message
        log.warning("Risk check unavailable: asking the user if they are safe")
        return ChatResult(kind="check", next_step="urgent")
    if risk is not None and risk.risk:
        log.info("Risk check said YES")
        return _possible_crisis(safe_confirmed)
    if risk is not None and not treat_as_english(message, risk.english):
        log.info("Message not in English: English-only message shown")
        return ChatResult(kind="reply", reply=ENGLISH_ONLY_MESSAGE, emergency_note=medical_worry, next_step="choose")

    # Layer 3: the AI reply
    answer = ai.generate_reply([*history, {"role": "user", "content": message}], level, worry, deadline)
    if answer is None:
        return ChatResult(kind="reply", reply=CALM_MESSAGE, emergency_note=medical_worry, next_step=next_step)

    # Layer 4: the reply check. A crisis-like reply means the AI noticed something, so ask the user.
    reply, model = answer
    checked = check_reply(reply)
    if not checked.ok:
        log.warning("AI reply replaced: %s (from %s)", checked.reason, model)
    if checked.crisis:
        log.info("Reply sounded like a crisis answer")
        return _possible_crisis(safe_confirmed)
    return ChatResult(
        kind="reply",
        reply=checked.text,
        emergency_note=medical_worry,
        next_step=next_step,
        source="ai" if checked.ok else "fixed",
    )
