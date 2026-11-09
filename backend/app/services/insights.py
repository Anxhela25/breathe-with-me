# Simple, descriptive patterns from the user's own episodes. Every sentence states counts or averages
# and never a cause; small numbers are not reported (docs/clinical-decisions.md, D8).
from collections import Counter
from datetime import datetime
from zoneinfo import ZoneInfo

from app.models import Episode

MIN_EPISODES = 5        # below this, the app says it needs more entries
MIN_SUPPORT = 3         # a pattern needs at least this many episodes behind it
MIN_SHARE = 0.5         # ... and at least half of the answered episodes
MIN_LEVEL_GAP = 1.5     # strength differences smaller than this are not reported

PERIODS = [("night", 0, 5), ("morning", 5, 12), ("afternoon", 12, 17), ("evening", 17, 22), ("night", 22, 24)]
PLACE_WORDS = {"home": "at home", "work": "at work", "street": "outside", "other": "somewhere else"}


def period_of(moment: datetime, tz: ZoneInfo) -> str:
    hour = moment.astimezone(tz).hour
    return next(name for name, start, end in PERIODS if start <= hour < end)


def strength(episode: Episode) -> int | None:
    return episode.worst_level or episode.start_level


def _average(values: list[int]) -> float:
    return sum(values) / len(values)


def _most_common(values: list) -> tuple[object, int, int] | None:
    """(value, count, answered) if one answer covers enough of the answered episodes."""
    answered = [v for v in values if v is not None]
    if not answered:
        return None
    value, count = Counter(answered).most_common(1)[0]
    if count >= MIN_SUPPORT and count / len(answered) >= MIN_SHARE:
        return value, count, len(answered)
    return None


def find_patterns(episodes: list[Episode], tz: ZoneInfo) -> list[dict]:
    patterns = []

    if top := _most_common([period_of(e.started_at, tz) for e in episodes]):
        period, count, total = top
        patterns.append({"key": "time_of_day", "text": f"Most episodes happened in the {period} ({count} of {total})."})

    if top := _most_common([e.place for e in episodes]):
        place, count, total = top
        patterns.append({"key": "place", "text": f"Most episodes happened {PLACE_WORDS[place.value]} ({count} of {total})."})

    short = [strength(e) for e in episodes if e.sleep and e.sleep.value in ("little", "very_little") and strength(e)]
    rested = [strength(e) for e in episodes if e.sleep and e.sleep.value == "well" and strength(e)]
    if len(short) >= 2 and len(rested) >= 2:
        a, b = _average(short), _average(rested)
        if abs(a - b) >= MIN_LEVEL_GAP:
            word = "stronger" if a > b else "milder"
            patterns.append({"key": "sleep", "text": (
                f"After little sleep, episodes were {word} on average ({a:.1f} vs {b:.1f} out of 10)."
            )})

    if top := _most_common([e.expected for e in episodes]):
        expected, count, total = top
        text = "You expected most episodes" if expected else "Most episodes came out of the blue"
        patterns.append({"key": "expected", "text": f"{text} ({count} of {total})."})

    if top := _most_common([e.with_someone for e in episodes]):
        with_someone, count, total = top
        who = "with someone" if with_someone else "alone"
        patterns.append({"key": "with_someone", "text": f"Most episodes happened when you were {who} ({count} of {total})."})

    if top := _most_common([e.coffee for e in episodes]):
        coffee, count, total = top
        if coffee:
            patterns.append({"key": "coffee", "text": f"You had coffee on the day of {count} of {total} episodes."})

    levels = [strength(e) for e in sorted(episodes, key=lambda e: e.started_at) if strength(e)]
    if len(levels) >= 6:
        first, last = _average(levels[:3]), _average(levels[-3:])
        if abs(first - last) >= MIN_LEVEL_GAP:
            word = "milder" if last < first else "stronger"
            patterns.append({"key": "trend", "text": (
                f"Your last 3 episodes were {word} on average than your first 3 ({last:.1f} vs {first:.1f} out of 10)."
            )})

    return patterns


def summarize(episodes: list[Episode], tz: ZoneInfo) -> dict:
    count = len(episodes)
    levels = [strength(e) for e in episodes if strength(e)]
    drops = [e.start_level - e.end_level for e in episodes if e.start_level and e.end_level]
    return {
        "count": count,
        "needed": MIN_EPISODES,
        "ready": count >= MIN_EPISODES,
        "patterns": find_patterns(episodes, tz) if count >= MIN_EPISODES else [],
        "average_strength": round(_average(levels), 1) if levels else None,
        "average_drop": round(_average(drops), 1) if drops else None,
        "first": min((e.started_at for e in episodes), default=None),
        "last": max((e.started_at for e in episodes), default=None),
    }
