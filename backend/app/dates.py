from datetime import datetime, timezone


def as_utc(moment: datetime) -> datetime:
    # some databases give dates back without a timezone; ours are always UTC
    return moment if moment.tzinfo else moment.replace(tzinfo=timezone.utc)
