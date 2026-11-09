# The AI doesn't always follow its instructions, so every reply is checked here.
# Anything that fails is swapped for a fixed message.
import re
from dataclasses import dataclass

CALM_MESSAGE = "I'm here. Let's keep following the circle together."
MEDICINE_MESSAGE = (
    "I can't advise on medicine. If you are worried, please ask a doctor or pharmacist. "
    "Let's keep breathing."
)
EMERGENCY_NOTE = "If you think this is a real medical emergency, call emergency services."
CHAT_LIMIT_MESSAGE = (
    "Thank you for telling me. Let's go back to the circle now, "
    "and if you can, reach out to someone you trust."
)

# word count matters more than sentence count
MAX_SENTENCES = 5
MAX_WORDS = 45

_MEDICINE = [
    r"\bpills?\b", r"\btablets?\b", r"\bmedicat", r"\bmedicine", r"\bdos(e|age|ing)\b", r"\bprescri",
    r"\bbenzo", r"\bxanax\b", r"\balprazolam\b", r"\bvalium\b", r"\bdiazepam\b", r"\blorazepam\b",
    r"\bclonazepam\b", r"\bsertraline\b", r"\bssri", r"\bbeta[- ]?blocker", r"\bpropranolol\b",
    r"\bibuprofen\b", r"\bparacetamol\b", r"\baspirin\b", r"\bsupplement",
]

# breathing should be slow and follow the circle: no deep breaths, holding or counting
_BREATHING = [
    r"\bdeep(ly)? breath", r"\bbreathe deep", r"\bbig breath", r"\bhold (your|the|it|for)\b",
    r"\bhold your breath", r"\bfor (\w+ )?counts?\b", r"\bcount of (\d+|one|two|three|four|five|six|seven|eight)\b",
    r"\bbox breathing\b", r"\b4-7-8\b",
]

_DIAGNOSIS_AND_PROMISES = [
    r"\bdiagnos", r"\bdisorder\b", r"\byou (have|are having) (a |an )?(panic|anxiety|heart)",
    r"\b(is|it'?s|this is) (not|n't) a heart attack\b", r"\bnot (a )?heart attack\b",
    r"\b(just|only) (a |an )?(panic|anxiety|wave|stress)\b", r"\bnothing (is )?wrong with (you|your)\b",
    r"\b(it|this)('s| is) (just|only)\b",
    r"\byou('| a)re (completely |totally )?safe\b", r"\byou are not dying\b", r"\byou('| a)re not dying\b",
    r"\beverything (is|will be) (fine|ok|okay|alright)\b", r"\bnothing bad will happen\b",
    r"\bi promise\b", r"\byou will be (fine|ok|okay)\b",
    r"\bi('| a)m (a )?(human|person|therapist|psychologist|doctor)\b",
]

# crisis topics are handled by the app, not the AI
_CRISIS_TOPICS = [r"\bsuicid", r"\bself[- ]?harm", r"\bkill (yourself|myself)\b", r"\bend (your|my) life\b"]

_MEDICINE_RE = [re.compile(p, re.I) for p in _MEDICINE]
_BREATHING_RE = [re.compile(p, re.I) for p in _BREATHING]
_OTHER_RE = [re.compile(p, re.I) for p in _DIAGNOSIS_AND_PROMISES + _CRISIS_TOPICS]


@dataclass
class ReplyCheck:
    ok: bool
    text: str
    reason: str = ""  # for logging


def _sentences(text: str) -> int:
    return len([s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s])


def check_reply(reply: str | None) -> ReplyCheck:
    text = (reply or "").strip().replace("’", "'")
    if not text:
        return ReplyCheck(False, CALM_MESSAGE, "empty")
    if any(p.search(text) for p in _MEDICINE_RE):
        return ReplyCheck(False, MEDICINE_MESSAGE, "medicine")
    if any(p.search(text) for p in _BREATHING_RE):
        return ReplyCheck(False, CALM_MESSAGE, "breathing wording")
    if any(p.search(text) for p in _OTHER_RE):
        return ReplyCheck(False, CALM_MESSAGE, "diagnosis, promise or crisis topic")
    if _sentences(text) > MAX_SENTENCES or len(text.split()) > MAX_WORDS:
        return ReplyCheck(False, CALM_MESSAGE, "too long")
    return ReplyCheck(True, text)
