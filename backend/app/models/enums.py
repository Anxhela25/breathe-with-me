import enum


class Place(str, enum.Enum):
    home = "home"
    work = "work"
    street = "street"
    other = "other"


class Sleep(str, enum.Enum):
    well = "well"
    little = "little"
    very_little = "very_little"


class ChatRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"


class MessageLabel(str, enum.Enum):
    physical_fear = "physical_fear"
    fear_of_bad = "fear_of_bad"
    trigger = "trigger"
    crisis = "crisis"
    unclear = "unclear"


class CalmCheckSource(str, enum.Enum):
    end_of_session = "end_of_session"
    practice = "practice"
    baseline = "baseline"
