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


class CalmCheckSource(str, enum.Enum):
    end_of_session = "end_of_session"
    practice = "practice"
    baseline = "baseline"
