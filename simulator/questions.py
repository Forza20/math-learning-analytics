"""Question generation for the simulator.

Mirrors makeQuestion() in game/index.html. Keep the two in sync: if a level
changes in the game, change it here too, or simulated and real data will
describe different questions.
"""
from __future__ import annotations

import random
from dataclasses import dataclass

TOPICS = ("addition", "subtraction", "multiplication", "division")
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


def make_question(topic: str, level: int, rng: random.Random) -> Question:
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
