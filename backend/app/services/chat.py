from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

from app.config import settings
from app.services import ai
from app.services.reply_check import CALM_MESSAGE, CHAT_LIMIT_MESSAGE, check_reply
from app.services.safety import SafetyLevel, check_message

_pool = ThreadPoolExecutor(max_workers=8)


@dataclass
class ChatResult:
    # "crisis": clear crisis, open urgent help. "check": possible crisis, ask the user first.
    kind: str
    reply: str | None = None
    emergency_note: bool = False
    next_step: str = "breathing"
    source: str = "fixed"  # "ai" or "fixed"


def run_chat(message: str, history: list[dict], level: int | None) -> ChatResult:
    # Layer 1: rules. Clear crisis messages never reach the AI.
    safety = check_message(message)
    if safety.level is SafetyLevel.crisis:
        return ChatResult(kind="crisis", next_step="urgent")
    worry = safety.level.value if safety.level in (SafetyLevel.medical_worry, SafetyLevel.fear_of_dying) else None
    medical_worry = worry is not None
    next_step = "grounding" if medical_worry else "breathing"

    user_messages = [m["content"] for m in history if m["role"] == "user"] + [message]
    if len(user_messages) > settings.chat_max_user_messages:
        return ChatResult(kind="reply", reply=CHAT_LIMIT_MESSAGE, emergency_note=medical_worry, next_step="breathing")

    # Layer 2: an AI risk check on the meaning (typos, slang, other languages), run alongside the reply
    risk = _pool.submit(ai.classify_risk, user_messages)
    answer = ai.generate_reply([*history, {"role": "user", "content": message}], level, worry)
    if risk.result() is True:
        return ChatResult(kind="check", next_step="urgent")

    if answer is None:
        return ChatResult(kind="reply", reply=CALM_MESSAGE, emergency_note=medical_worry, next_step=next_step)

    # Layer 3: the reply check. A crisis-like reply means the AI noticed something; ask the user.
    checked = check_reply(answer[0])
    if checked.crisis:
        return ChatResult(kind="check", next_step="urgent")
    return ChatResult(
        kind="reply",
        reply=checked.text,
        emergency_note=medical_worry,
        next_step=next_step,
        source="ai" if checked.ok else "fixed",
    )
