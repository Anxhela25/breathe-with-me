# Rule-based check, runs before any AI call. English only.
# The phrase lists still need clinical review before real users.
import re
import unicodedata
from dataclasses import dataclass, field
from enum import Enum


class SafetyLevel(str, Enum):
    crisis = "crisis"
    medical_worry = "medical_worry"  # physical symptom, never call it panic
    fear_of_dying = "fear_of_dying"  # panic symptom, can be normalised
    ok = "ok"


# "don't want to die" is fear of dying, not a wish to die. It's removed before the crisis check
# so it doesn't match "want to die". Other crisis phrases in the message still count.
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


# People in distress type fast ("i wnat to diee", "kill myselv"), so words one typo away from
# a key word count as that word. A false alarm is better than a missed crisis.
# Negations (dont, cant, never) aren't corrected, that could change the meaning.
_KEY_WORDS = [
    "die", "dying", "dead", "end", "ending", "cut", "want", "wanna", "wish", "kill", "killing", "myself", "self",
    "life", "live", "living", "alive", "suicide", "suicidal", "harm", "harming", "hurt", "hurting", "overdose",
    "scared", "afraid", "terrified", "going", "gonna",
]
# real words that are one letter from a key word but mean something else
_LEAVE_ALONE = {
    "love", "like", "line", "lime", "lift", "wife", "went", "wait", "with", "will", "wild", "mild", "kilo",
    "deal", "read", "head", "lead", "dear", "deed", "sell", "seal", "hurl", "farm", "warm", "gone", "doing",
    "and", "can", "cat", "dig", "did", "due", "dye", "see", "set", "sad", "dad", "mad", "bad",
    "loving", "giving", "lining", "diving", "hiring",
    # other forms of key words, already spelled right
    "hurts", "dies", "died", "wants", "kills", "lives", "cuts", "ends", "ended", "harms", "wishes",
}

# long, distinctive key words: two typos still count ("myselve")
_TWO_TYPOS_OK = {"myself", "suicide", "suicidal", "overdose"}

# "dye" is a real word, so it only counts as "die" when it isn't dyeing something ("dye my hair")
_DYE_OBJECTS = {"my", "your", "her", "his", "their", "our", "the", "it", "them", "this", "that", "some", "a", "hair"}

# more than one typo away, but common
_COMMON_MISSPELLINGS = {"too": "to", "dieing": "dying", "dyeing": "dying", "kms": "kill myself"}


def _squash(word: str) -> str:
    # "diee" -> "die", "kiiill" -> "kil", "wanna" -> "wana"
    return re.sub(r"(.)\1+", r"\1", word)


def _one_typo(a: str, b: str) -> bool:
    """True if a and b differ by one added, missing, changed or swapped letter."""
    if abs(len(a) - len(b)) > 1:
        return False
    if len(a) == len(b):
        diff = [i for i in range(len(a)) if a[i] != b[i]]
        if len(diff) == 1:
            return True
        return len(diff) == 2 and diff[1] == diff[0] + 1 and a[diff[0]] == b[diff[1]] and a[diff[1]] == b[diff[0]]
    short, long_ = sorted((a, b), key=len)
    return any(long_[:i] + long_[i + 1:] == short for i in range(len(long_)))


def _typos(a: str, b: str) -> int:
    """Number of added, missing, changed or swapped letters between a and b."""
    prev2, prev = None, list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        row = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            row[j] = min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
            if prev2 and i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                row[j] = min(row[j], prev2[j - 2] + 1)
        prev2, prev = prev, row
    return prev[-1]


def _key_word(word: str) -> str:
    # stretched letters: "toooo" -> "to", "wantttt" -> "want", "dyeeeee" -> "dye" (double letters stay)
    word = re.sub(r"(.)\1{2,}", r"\1", word)
    if word in _COMMON_MISSPELLINGS:
        return _COMMON_MISSPELLINGS[word]
    if word in _KEY_WORDS or word in _LEAVE_ALONE or len(word) < 3 or not word.isalpha():
        return word
    for key in _KEY_WORDS:
        if _squash(word) == _squash(key):
            return key
    for key in _KEY_WORDS:
        if len(key) <= 3:
            # short words: only swapped letters ("dei"); a changed letter makes a different word
            if len(word) == 3 and sorted(word) == sorted(key) and _one_typo(word, key):
                return key
        elif _one_typo(_squash(word), _squash(key)) and (word[0] == key[0] or word[:2] == key[1::-1]):
            # the first letter is almost always typed right
            return key
    for key in _TWO_TYPOS_OK:
        if word[0] == key[0] and len(word) >= 5 and _typos(word, key) <= 2:
            return key
    return word


def fix_typos(clean: str) -> str:
    words = [_key_word(w) for w in clean.split()]
    for i, word in enumerate(words):
        if word == "dye" and (i + 1 == len(words) or words[i + 1] not in _DYE_OBJECTS):
            words[i] = "die"
    return " ".join(" ".join(words).split())  # "kms" became two words


def check_message(text: str) -> SafetyResult:
    clean = fix_typos(normalize(text or ""))
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
