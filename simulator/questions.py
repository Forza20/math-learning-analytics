"""Question generation for the simulator.

Mirrors makeQuestion() in game/index.html. Keep the two in sync: if a level
changes in the game, change it here too, or simulated and real data will
describe different questions.
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Optional

TOPICS = ("addition", "subtraction", "multiplication", "division")
# Added on 2026-11-22. Kept apart from TOPICS so days before that simulate exactly as before.
MIXED = "mixed"
TASK_TYPES = ("sequence", "unit", "symbol", "price", "array")
LEVELS = (1, 2, 3)

# Addition/subtraction: numbers within this limit.
RANGE = {1: 100, 2: 500, 3: 1000}
# Multiplication: (min, max) for each factor.
FACTORS = {1: ((2, 10), (1, 10)), 2: ((11, 20), (2, 9)), 3: ((11, 30), (11, 20))}
# Division: (min, max) for divisor and quotient. Answers are always whole.
DIVISION = {1: ((2, 10), (1, 10)), 2: ((2, 9), (11, 25)), 3: ((11, 20), (2, 20))}


@dataclass(frozen=True)
class Question:
    topic: str
    level: int
    a: int
    b: int
    answer: int
    task_type: Optional[str] = None      # set for topic "mixed" only
    text: Optional[str] = None           # question_text, ASCII, for topic "mixed" only


def make_question(topic: str, level: int, rng: random.Random, task_type: Optional[str] = None) -> Question:
    if topic == MIXED:
        return make_mixed(task_type or rng.choice(TASK_TYPES), level, rng)
    if topic == "addition":
        top = RANGE[level]
        a = rng.randint(top // 10, top - 1)
        b = rng.randint(1, top - a)
        return Question(topic, level, a, b, a + b)
    if topic == "subtraction":
        top = RANGE[level]
        a = rng.randint(top // 10, top)
        b = rng.randint(1, a)
        return Question(topic, level, a, b, a - b)
    if topic == "multiplication":
        (a_min, a_max), (b_min, b_max) = FACTORS[level]
        a = rng.randint(a_min, a_max)
        b = rng.randint(b_min, b_max)
        if rng.random() < 0.5:
            a, b = b, a
        return Question(topic, level, a, b, a * b)
    if topic == "division":
        # Built backwards from divisor x quotient, so the answer is whole.
        (d_min, d_max), (q_min, q_max) = DIVISION[level]
        divisor = rng.randint(d_min, d_max)
        quotient = rng.randint(q_min, q_max)
        return Question(topic, level, divisor * quotient, divisor, quotient)
    raise ValueError(f"unknown topic: {topic}")


# ---- Mixed puzzles ----------------------------------------------------------
# Mirrors MIXED in game/index.html. operand_a and operand_b have a fixed meaning
# per task type, documented in supabase/migrations/0002_mixed_topic.sql.

FRUIT = ("banana", "strawberry", "apple", "melon", "lolly")

# (from unit, to unit, factor, multiply, (lo, hi, kind)); amounts are in tenths.
# kind "whole" = lo..hi, "hundreds"/"thousands" = lo..hi times 100/1000, "half" = lo.5..hi.5
UNITS = {
    1: [("m", "cm", 100, True, (1, 9, "whole")), ("km", "m", 1000, True, (1, 9, "whole")),
        ("h", "min", 60, True, (1, 5, "whole"))],
    2: [("kg", "g", 1000, True, (1, 9, "whole")), ("min", "s", 60, True, (1, 10, "whole")),
        ("cm", "m", 100, False, (1, 9, "hundreds")), ("day", "h", 24, True, (1, 7, "whole")),
        ("m", "km", 1000, False, (1, 9, "thousands"))],
    3: [("h", "min", 60, True, (1, 4, "half")), ("km", "m", 1000, True, (0, 9, "half")),
        ("kg", "g", 1000, True, (0, 9, "half")), ("m", "cm", 100, True, (0, 9, "half")),
        ("min", "s", 60, True, (1, 9, "half"))],
}
_UNIT_SCALE = {"whole": 1, "hundreds": 100, "thousands": 1000}


def _tenths(lo: int, hi: int, kind: str, rng: random.Random) -> int:
    if kind == "half":
        return rng.randint(lo, hi) * 10 + 5
    return rng.randint(lo, hi) * _UNIT_SCALE[kind] * 10


def _amount_text(tenths: int) -> str:
    return str(tenths // 10) if tenths % 10 == 0 else f"{tenths // 10}.{tenths % 10}"


def make_mixed(task_type: str, level: int, rng: random.Random) -> Question:
    def q(a: int, b: int, answer: int, text: str) -> Question:
        return Question(MIXED, level, a, b, answer, task_type, text)

    if task_type == "sequence":
        up = True
        if level == 1:
            step = rng.choice((2, 5, 10))
            start = step * rng.randint(0, 5)
        elif level == 2:
            step = rng.randint(3, 9)
            up = rng.random() < 0.5
            start = rng.randint(1, 60) if up else rng.randint(4 * step, 4 * step + 60)
        else:
            step = rng.randint(11, 25) if rng.random() < 0.5 else rng.choice((25, 50, 100))
            up = rng.random() < 0.5
            start = rng.randint(100, 500) if up else rng.randint(4 * step + 50, 4 * step + 500)
        d = step if up else -step
        terms = [start + i * d for i in range(4)]
        return q(terms[3], step, terms[3] + d, ", ".join(map(str, terms)) + ", ?")

    if task_type == "unit":
        src, dst, factor, multiply, (lo, hi, kind) = rng.choice(UNITS[level])
        tenths = _tenths(lo, hi, kind, rng)
        answer = tenths * factor // 10 if multiply else tenths // 10 // factor
        return q(factor, 0, answer, f"{_amount_text(tenths)} {src} = ? {dst}")

    if task_type == "symbol":
        if level == 1:
            x = rng.randint(2, 10)
            return q(2 * x, 0, x, f"A+A={2 * x}; A=?")
        x = rng.randint(2, 10) if level == 2 else rng.randint(4, 15)
        y = rng.randint(2, 12) if level == 2 else rng.randint(5, 25)
        n = 2 if level == 2 else 3
        return q(x + y, x, y, f"{'+'.join('A' * n)}={n * x}; A+B={x + y}; B=?")

    if task_type == "price":
        x, y = rng.sample(FRUIT, 2)
        if level == 1:
            p, n = rng.randint(2, 10), rng.randint(2, 5)
            return q(n * p, n, p, f"{n} {x}={n * p}; {x}=?")
        p = rng.randint(2, 10) if level == 2 else rng.randint(5, 20)
        price = rng.randint(2, 10) if level == 2 else rng.randint(5, 25)
        n = rng.randint(2, 4)
        k = rng.randint(1, 3) if level == 2 else rng.randint(2, 3)
        m = 1 if level == 2 else 2
        total = k * price + m * p
        return q(total, k, price, f"{n} {x}={n * p}; {k} {y}+{m} {x}={total}; {y}=?")

    if task_type == "array":
        r0, r1, c0, c1 = {1: (2, 5, 2, 5), 2: (3, 5, 4, 8), 3: (4, 6, 6, 10)}[level]
        rows, cols = rng.randint(r0, r1), rng.randint(c0, c1)
        return q(rows, cols, rows * cols, f"{rows}x{cols} grid")

    raise ValueError(f"unknown task type: {task_type}")
