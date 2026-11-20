"""Wrong-answer models.

Each generator returns a plausible wrong answer, or None when the error type
does not apply to the question. The simulator records which type it used, so
the silver layer's error classification can later be checked against it.
"""
from __future__ import annotations

import random
from typing import Callable, Optional

from questions import Question

# Relative weight of each error type per topic.
ERROR_WEIGHTS = {
    # Systematic errors dominate; "random" covers guesses and stray key presses.
    "addition": {"carry_borrow": 40, "off_by_one": 25, "reversed_digits": 10, "wrong_operation": 15, "random": 10},
    "subtraction": {"carry_borrow": 45, "off_by_one": 20, "reversed_digits": 10, "wrong_operation": 15, "random": 10},
    "multiplication": {"table_neighbor": 45, "off_by_one": 15, "reversed_digits": 10, "wrong_operation": 15, "random": 15},
    "division": {"off_by_one": 40, "wrong_operation": 25, "reversed_digits": 15, "random": 20},
}


def off_by_one(q: Question, rng: random.Random) -> Optional[int]:
    return q.answer + rng.choice((-1, 1))


def _column_op(a: int, b: int, op: Callable[[int, int], int]) -> int:
    width = max(len(str(a)), len(str(b)))
    xs, ys = str(a).zfill(width), str(b).zfill(width)
    return int("".join(str(op(int(x), int(y))) for x, y in zip(xs, ys)))


def carry_borrow(q: Question, rng: random.Random) -> Optional[int]:
    """Column-by-column arithmetic without carrying or borrowing.

    Addition: 47 + 38 -> 75 (writes 15 as 5, drops the carry).
    Subtraction: 52 - 17 -> 45 (takes the smaller digit from the larger).
    """
    if q.topic == "addition":
        return _column_op(q.a, q.b, lambda x, y: (x + y) % 10)
    if q.topic == "subtraction":
        return _column_op(q.a, q.b, lambda x, y: abs(x - y))
    return None


def reversed_digits(q: Question, rng: random.Random) -> Optional[int]:
    text = str(q.answer)
    return int(text[::-1]) if len(text) > 1 else None


def wrong_operation(q: Question, rng: random.Random) -> Optional[int]:
    options = {
        "addition": [abs(q.a - q.b), q.a * q.b],
        "subtraction": [q.a + q.b],
        "multiplication": [q.a + q.b],
        "division": [q.a - q.b, q.a * q.b],
    }[q.topic]
    return rng.choice(options)


def table_neighbor(q: Question, rng: random.Random) -> Optional[int]:
    """One factor off by one: 7 x 8 answered as 7 x 7 or 6 x 8."""
    if q.topic != "multiplication":
        return None
    if rng.random() < 0.5:
        return q.a * (q.b + rng.choice((-1, 1)))
    return (q.a + rng.choice((-1, 1))) * q.b


def random_answer(q: Question, rng: random.Random) -> Optional[int]:
    """A guess of about the right size, sometimes with a stray extra key press."""
    digits = len(str(q.answer))
    if rng.random() < 0.2:
        digits += 1
    low = 10 ** (digits - 1) if digits > 1 else 0
    return rng.randint(low, 10 ** digits - 1)


GENERATORS: dict[str, Callable[[Question, random.Random], Optional[int]]] = {
    "off_by_one": off_by_one,
    "carry_borrow": carry_borrow,
    "reversed_digits": reversed_digits,
    "wrong_operation": wrong_operation,
    "table_neighbor": table_neighbor,
    "random": random_answer,
}


def is_valid_wrong(q: Question, value: Optional[int]) -> bool:
    # Must fit the game's input (digits only, max 10) and differ from the answer.
    return value is not None and value >= 0 and value != q.answer and len(str(value)) <= 10


def make_wrong_answer(q: Question, rng: random.Random) -> tuple[int, str]:
    """Return (wrong answer, error type)."""
    weights = ERROR_WEIGHTS[q.topic]
    types = list(weights)
    for _ in range(10):
        error_type = rng.choices(types, weights=[weights[t] for t in types])[0]
        value = GENERATORS[error_type](q, rng)
        if is_valid_wrong(q, value):
            return value, error_type
    return q.answer + 1, "off_by_one"
