import random
import re
import uuid
from datetime import date, datetime

import pytest

from errors import ERROR_WEIGHTS, carry_borrow, make_wrong_answer, reversed_digits
from questions import LEVELS, TOPICS, Question, make_question
from simulate import COLUMNS, carries, question_difficulty, simulate_day

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


def test_carries():
    assert carries(47, 38, subtract=False) == 1
    assert carries(999, 1, subtract=False) == 3
    assert carries(23, 14, subtract=False) == 0
    assert carries(52, 17, subtract=True) == 1
    assert carries(100, 1, subtract=True) == 2
    assert carries(58, 23, subtract=True) == 0


def test_hard_tables_and_carrying_are_harder():
    def q(topic, a, b, level=1):
        answer = {"addition": a + b, "subtraction": a - b, "multiplication": a * b, "division": a // b}[topic]
        return Question(topic, level, a, b, answer)

    assert question_difficulty(q("multiplication", 7, 8)) > question_difficulty(q("multiplication", 2, 5))
    assert question_difficulty(q("division", 56, 8)) > question_difficulty(q("division", 50, 5))
    assert question_difficulty(q("addition", 47, 38)) > question_difficulty(q("addition", 23, 14)) == 0


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


# ---- Mixed puzzles ------------------------------------------------------------

from questions import MIXED, TASK_TYPES  # noqa: E402
from simulate import MIXED_FROM  # noqa: E402

MIXED_CHECK = {
    # Recompute the answer from operand_a and operand_b where they define it.
    "sequence": lambda q: q.answer in (q.a + q.b, q.a - q.b),
    "unit": lambda q: q.a in (24, 60, 100, 1000) and q.b == 0,
    "symbol": lambda q: q.answer == (q.a // 2 if q.b == 0 else q.a - q.b),
    "price": lambda q: q.b >= 1,
    "array": lambda q: q.answer == q.a * q.b,
}


@pytest.mark.parametrize("task_type", TASK_TYPES)
@pytest.mark.parametrize("level", LEVELS)
def test_mixed_tasks_are_consistent_and_fit_db_constraints(task_type, level):
    rng = random.Random(3)
    for _ in range(3000):
        q = make_question(MIXED, level, rng, task_type)
        assert q.topic == MIXED and q.task_type == task_type
        assert MIXED_CHECK[task_type](q)
        assert all(isinstance(v, int) and v >= 0 for v in (q.a, q.b, q.answer))
        assert q.a <= 1000 and q.b <= 1000 and q.answer <= 1_000_000
        # Matches the bronze check: printable ASCII, 1-80 characters.
        assert re.fullmatch(r"[ -~]{1,80}", q.text), q.text


def test_unit_examples():
    rng = random.Random(0)
    for _ in range(500):
        q = make_question(MIXED, 3, rng, "unit")
        amount, src, _, _, dst = q.text.split()
        factor = {("h", "min"): 60, ("km", "m"): 1000, ("kg", "g"): 1000, ("m", "cm"): 100, ("min", "s"): 60}[(src, dst)]
        assert q.answer == round(float(amount) * factor)


@pytest.mark.parametrize("task_type", TASK_TYPES)
def test_mixed_wrong_answers_are_wrong_and_valid(task_type):
    rng = random.Random(4)
    seen = set()
    for level in LEVELS:
        for _ in range(2000):
            q = make_question(MIXED, level, rng, task_type)
            value, error_type = make_wrong_answer(q, rng)
            assert value != q.answer and value >= 0 and len(str(value)) <= 10
            seen.add(error_type)
    assert seen == set(ERROR_WEIGHTS[task_type])


def test_mixed_only_from_its_start_date():
    before, _ = simulate_day(date(2026, 11, 21), 40, seed=1)
    after, _ = simulate_day(MIXED_FROM, 40, seed=1)
    assert {e["topic"] for e in before} <= set(TOPICS)
    assert all(e["task_type"] is None and e["question_text"] is None for e in before)
    mixed = [e for e in after if e["topic"] == MIXED]
    assert mixed and all(e["task_type"] in TASK_TYPES and e["question_text"] for e in mixed)
    # Two of each task type per completed mixed round.
    rounds = {}
    for e in mixed:
        rounds.setdefault(e["session_id"], []).append(e["task_type"])
    full = [types for types in rounds.values() if len(types) == 10]
    assert full and all(sorted(types) == sorted(TASK_TYPES * 2) for types in full)
