from dataclasses import dataclass

from app.config import settings
from app.services import ai
from app.services.reply_check import CALM_MESSAGE, CHAT_LIMIT_MESSAGE, check_reply
from app.services.safety import SafetyLevel, check_message


@dataclass
class ChatResult:
    kind: str  # "crisis" or "reply"
    reply: str | None = None
    emergency_note: bool = False
    next_step: str = "breathing"
    source: str = "fixed"  # "ai" or "fixed"


def run_chat(message: str, history: list[dict], level: int | None) -> ChatResult:
    # crisis messages never reach the AI
    safety = check_message(message)
    if safety.level is SafetyLevel.crisis:
        return ChatResult(kind="crisis", next_step="urgent")
    worry = safety.level.value if safety.level in (SafetyLevel.medical_worry, SafetyLevel.fear_of_dying) else None
    medical_worry = worry is not None
    next_step = "grounding" if medical_worry else "breathing"

    user_messages = sum(1 for m in history if m["role"] == "user") + 1
    if user_messages > settings.chat_max_user_messages:
        return ChatResult(kind="reply", reply=CHAT_LIMIT_MESSAGE, emergency_note=medical_worry, next_step="breathing")

    answer = ai.generate_reply([*history, {"role": "user", "content": message}], level, worry)
    if answer is None:
        return ChatResult(kind="reply", reply=CALM_MESSAGE, emergency_note=medical_worry, next_step=next_step)

    checked = check_reply(answer[0])
    return ChatResult(
        kind="reply",
        reply=checked.text,
        emergency_note=medical_worry,
        next_step=next_step,
        source="ai" if checked.ok else "fixed",
    )
