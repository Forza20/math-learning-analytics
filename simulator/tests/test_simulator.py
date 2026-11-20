import random
import re
import uuid
from datetime import date, datetime

import pytest

from errors import ERROR_WEIGHTS, carry_borrow, make_wrong_answer, reversed_digits
from questions import LEVELS, TOPICS, Question, make_question
from simulate import COLUMNS, simulate_day

OPS = {
    "addition": lambda a, b: a + b,
    "subtraction": lambda a, b: a - b,
    "multiplication": lambda a, b: a * b,
    "division": lambda a, b: a / b,
}


@pytest.mark.parametrize("topic", TOPICS)
@pytest.mark.parametrize("level", LEVELS)
def test_questions_are_correct_and_fit_db_constraints(topic, level):
    rng = random.Random(1)
    for _ in range(5000):
        q = make_question(topic, level, rng)
        assert OPS[topic](q.a, q.b) == q.answer
        assert all(isinstance(v, int) and v >= 0 for v in (q.a, q.b, q.answer))
        assert q.a <= 1000 and q.b <= 1000 and q.answer <= 1_000_000


def test_carry_borrow_examples():
    rng = random.Random(0)
    assert carry_borrow(Question("addition", 1, 47, 38, 85), rng) == 75
    assert carry_borrow(Question("subtraction", 1, 52, 17, 35), rng) == 45
    assert carry_borrow(Question("multiplication", 1, 7, 8, 56), rng) is None


def test_reversed_digits_examples():
    rng = random.Random(0)
    assert reversed_digits(Question("multiplication", 1, 7, 8, 56), rng) == 65
    assert reversed_digits(Question("division", 1, 8, 2, 4), rng) is None


@pytest.mark.parametrize("topic", TOPICS)
def test_wrong_answers_are_wrong_and_valid(topic):
    rng = random.Random(2)
    seen = set()
    for level in LEVELS:
        for _ in range(3000):
            q = make_question(topic, level, rng)
            value, error_type = make_wrong_answer(q, rng)
            assert value != q.answer
            assert value >= 0 and len(str(value)) <= 10
            seen.add(error_type)
    # Every error type configured for the topic shows up.
    assert seen == set(ERROR_WEIGHTS[topic])


def test_same_date_gives_same_events():
    a, _ = simulate_day(date(2026, 11, 19), 10, seed=20261119)
    b, _ = simulate_day(date(2026, 11, 19), 10, seed=20261119)
    assert a == b


def test_events_fit_db_constraints():
    events, stats = simulate_day(date(2026, 11, 21), 50, seed=7)  # a Saturday
    assert events and stats["wrong"] and stats["skipped"] and stats["rounds_quit"]
    ids = set()
    for e in events:
        assert list(e) == COLUMNS
        assert e["source"] == "simulated"
        assert e["language"] in ("da", "en")
        assert e["topic"] in TOPICS and e["level"] in LEVELS
        assert 1 <= e["question_index"] <= 10
        assert 0 <= e["response_ms"] <= 600_000
        assert e["given_answer"] is None or re.fullmatch(r"\d{1,10}", e["given_answer"])
        uuid.UUID(e["session_id"])
        ids.add(e["event_id"])
        assert datetime.fromisoformat(e["client_ts"]).tzinfo is not None
    assert len(ids) == len(events)


def test_sessions_have_consecutive_question_indexes():
    events, _ = simulate_day(date(2026, 11, 19), 30, seed=3)
    by_session = {}
    for e in events:
        by_session.setdefault(e["session_id"], []).append(e["question_index"])
    for indexes in by_session.values():
        assert indexes == list(range(1, len(indexes) + 1))
