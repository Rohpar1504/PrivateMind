"""Pure SM-2 spaced repetition algorithm — no database, no I/O."""

from dataclasses import dataclass
from datetime import date, timedelta

EASE_MIN = 1.3


@dataclass
class SM2Update:
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review_date: date


def apply_sm2(
    *,
    ease_factor: float,
    interval_days: int,
    repetitions: int,
    rating: str,  # "easy" | "hard"
) -> SM2Update:
    """
    Apply one SM-2 review cycle.

    Easy → q=5 (remembered well)
    Hard → q=2 (barely remembered / forgotten — resets)
    """
    q = 5 if rating == "easy" else 2

    if q >= 3:
        # Remembered — advance the schedule
        if repetitions == 0:
            new_interval = 1
        elif repetitions == 1:
            new_interval = 6
        else:
            new_interval = round(interval_days * ease_factor)

        new_ease = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        new_ease = max(EASE_MIN, new_ease)
        new_repetitions = repetitions + 1
    else:
        # Forgotten — reset
        new_interval = 1
        new_ease = max(EASE_MIN, ease_factor - 0.2)
        new_repetitions = 0

    next_date = date.today() + timedelta(days=new_interval)

    return SM2Update(
        ease_factor=round(new_ease, 4),
        interval_days=new_interval,
        repetitions=new_repetitions,
        next_review_date=next_date,
    )
