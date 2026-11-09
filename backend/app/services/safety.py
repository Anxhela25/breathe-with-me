# Rule-based, runs before any AI call. The phrase lists need clinical review and translations
# before real users.
import re
import unicodedata
from dataclasses import dataclass, field
from enum import Enum


class SafetyLevel(str, Enum):
    crisis = "crisis"
    medical_worry = "medical_worry"  # physical symptom, never call it panic
    fear_of_dying = "fear_of_dying"  # panic symptom, can be normalised
    ok = "ok"


# "don't want to die" is fear of dying, not a wish to die. It's stripped before the crisis check so it
# doesn't match "want to die"; any other crisis phrase in the message still counts.
_NOT_WANTING_TO_DIE = r"\b(dont|do not|didnt|did not|never) (want|wanna)( to)? die\b"

_CRISIS_PATTERNS = [
    r"\b(want|wanna|wish i (could|would)|ready) (to )?die\b",
    r"\bwish i (was|were) dead\b",
    r"\bbetter off dead\b",
    r"\bkill(ing)? my ?self\b",
    r"\bend(ing)? (my|it) (life|all)\b",
    r"\bend it\b",
    r"\btake my (own )?life\b",
    r"\bsuicid",
    r"\bself[ -]?harm",
    r"\b(hurt|cut|harm)(ing)? my ?self\b",
    r"\bcan ?not go on\b",
    r"\bcant go on\b",
    r"\b(dont|do not) want to (live|be alive|be here)( anymore)?\b",
    r"\bno (reason|point) (to|in) (live|living)\b",
    r"\boverdos",
]

_MEDICAL_WORRY_PATTERNS = [
    r"\bheart attack\b",
    r"\bchest (pain|pains|hurts|is hurting|feels tight|tightness|pressure)\b",
    r"\b(pain|pressure|tightness) in my chest\b",
    r"\bstroke\b",
    r"\bfaint",
    r"\bpass(ing)? out\b",
    r"\b(going|gonna) (to )?(faint|pass out)\b",
    r"\bwill (faint|pass out)\b",
]

# fear of dying is a listed panic symptom (DSM-5-TR)
_FEAR_OF_DYING_PATTERNS = [
    _NOT_WANTING_TO_DIE,
    r"\b(i am|im|am i) dying\b",
    r"\b(going|gonna) (to )?die\b",
    r"\bwill die\b",
    r"\b(scared|afraid|terrified|frightened) (of )?(dying|death)\b",
]

_NOT_WANTING_TO_DIE_RE = re.compile(_NOT_WANTING_TO_DIE)
_CRISIS_RE = [re.compile(p) for p in _CRISIS_PATTERNS]
_MEDICAL_RE = [re.compile(p) for p in _MEDICAL_WORRY_PATTERNS]
_FEAR_RE = [re.compile(p) for p in _FEAR_OF_DYING_PATTERNS]


@dataclass
class SafetyResult:
    level: SafetyLevel
    matched: list[str] = field(default_factory=list)

    @property
    def is_crisis(self) -> bool:
        return self.level is SafetyLevel.crisis


def normalize(text: str) -> str:
    # "I CAN’T go on" -> "i cant go on"
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower().replace("’", "").replace("'", "").replace("`", "")
    text = re.sub(r"[^a-z0-9\s-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def check_message(text: str) -> SafetyResult:
    clean = normalize(text or "")
    for_crisis = _NOT_WANTING_TO_DIE_RE.sub(" ", clean)
    crisis = [p.pattern for p in _CRISIS_RE if p.search(for_crisis)]
    if crisis:
        return SafetyResult(SafetyLevel.crisis, crisis)
    worry = [p.pattern for p in _MEDICAL_RE if p.search(clean)]
    if worry:  # physical symptoms take priority
        return SafetyResult(SafetyLevel.medical_worry, worry)
    fear = [p.pattern for p in _FEAR_RE if p.search(clean)]
    if fear:
        return SafetyResult(SafetyLevel.fear_of_dying, fear)
    return SafetyResult(SafetyLevel.ok)
