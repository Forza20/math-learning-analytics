"""Generate simulated players for one day and load their answers into bronze.

Usage:
    python simulator/simulate.py --dry-run                 # summary only, writes nothing
    python simulator/simulate.py                           # load yesterday (Copenhagen time)
    python simulator/simulate.py --date 2026-11-19 --players 40
    python simulator/simulate.py --dry-run --out sample.csv

Runs are idempotent: the random seed comes from the date, so a re-run creates
the same event IDs and rows that already exist are skipped.
"""
from __future__ import annotations

import argparse
import csv
import math
import os
import random
import sys
import uuid
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from errors import make_wrong_answer
from questions import LEVELS, MIXED, TASK_TYPES, TOPICS, Question, make_question

LOCAL_TZ = ZoneInfo("Europe/Copenhagen")
QUESTIONS_PER_ROUND = 10
# The game got the "mixed" topic on this day. Earlier days are simulated with the
# four original topics only, so a re-run recreates exactly the same rows.
MIXED_FROM = date(2026, 11, 22)
# Pause the game shows after an answer before the next question (game/index.html).
PAUSE_CORRECT_MS = 700
PAUSE_OTHER_MS = 1600

COLUMNS = [
    "event_id", "session_id", "source", "language", "topic", "level", "question_index",
    "operand_a", "operand_b", "correct_answer", "given_answer", "response_ms", "client_ts",
    "task_type", "question_text",
]

# Relative activity per local hour 0-23. Weekdays peak after school.
HOUR_WEIGHTS_WEEKDAY = [0, 0, 0, 0, 0, 0, 1, 3, 2, 1, 1, 1, 2, 2, 4, 8, 10, 9, 8, 7, 5, 3, 1, 0]
HOUR_WEIGHTS_WEEKEND = [0, 0, 0, 0, 0, 0, 0, 1, 3, 5, 6, 6, 5, 5, 5, 6, 6, 6, 5, 5, 4, 2, 1, 0]

# How much each topic and level lowers the chance of a correct answer.
TOPIC_DIFFICULTY = {"addition": 0.00, "subtraction": 0.05, "multiplication": 0.10, "division": 0.15, "mixed": 0.08}
LEVEL_DIFFICULTY = {1: 0.00, 2: 0.15, 3: 0.30}
# Typical seconds to answer, before player speed and noise.
BASE_SECONDS = {1: 4.0, 2: 8.0, 3: 13.0}
TOPIC_TIME = {"addition": 1.0, "subtraction": 1.1, "multiplication": 1.2, "division": 1.4, "mixed": 1.5}
# Mixed puzzles: extra difficulty per task type. Two-step symbol and price puzzles
# and half units are the hard ones; counting a grid is the easiest.
TASK_DIFFICULTY = {"sequence": 0.00, "unit": 0.06, "symbol": 0.04, "price": 0.08, "array": -0.08}


def topics_for(day: date) -> tuple[str, ...]:
    return TOPICS + (MIXED,) if day >= MIXED_FROM else TOPICS


@dataclass
class Player:
    skill: float               # 0..1 overall ability
    topic_bonus: dict          # per-topic adjustment to skill
    speed: float               # time multiplier, above 1 is slower
    persistence: float         # 0..1, higher means quits less
    language: str


def make_player(rng: random.Random, topics: tuple[str, ...] = TOPICS) -> Player:
    return Player(
        skill=rng.betavariate(5, 2.5),
        topic_bonus={t: rng.gauss(0, 0.08) for t in topics},
        speed=rng.lognormvariate(0, 0.25),
        persistence=rng.betavariate(4, 1.5),
        language="da" if rng.random() < 0.7 else "en",
    )


def pick_level(player: Player, rng: random.Random) -> int:
    # Stronger players choose harder levels more often.
    weights = [max(0.05, 1.2 - player.skill), 0.6, max(0.05, player.skill - 0.3)]
    return rng.choices(LEVELS, weights=weights)[0]


# Extra difficulty per factor in a times table. 2, 5 and 10 are learnt first;
# 6-9 are the classic hard ones.
FACTOR_DIFFICULTY = {1: 0.00, 2: 0.00, 3: 0.04, 4: 0.04, 5: 0.00,
                     6: 0.08, 7: 0.11, 8: 0.11, 9: 0.08, 10: 0.00}


def carries(a: int, b: int, subtract: bool) -> int:
    """Number of columns that need a carry (addition) or a borrow (subtraction)."""
    count, carry = 0, 0
    while a or b:
        x, y = a % 10, b % 10
        if subtract:
            carry = 1 if x - carry < y else 0
        else:
            carry = 1 if x + y + carry >= 10 else 0
        count += carry
        a, b = a // 10, b // 10
    return count


def _table_difficulty(a: int, b: int) -> float:
    hard, easy = sorted((FACTOR_DIFFICULTY.get(a, 0.0), FACTOR_DIFFICULTY.get(b, 0.0)), reverse=True)
    return hard + 0.5 * easy


# Average table difficulty at level 1, so centring keeps each level's overall difficulty.
_MUL_L1_MEAN = sum(_table_difficulty(a, b) for a in range(2, 11) for b in range(1, 11)) / 90
_DIV_L1_MEAN = sum(FACTOR_DIFFICULTY[d] for d in range(2, 11)) / 9


def question_difficulty(q: Question) -> float:
    """How much harder this exact question is than others at its level.

    Carrying and borrowing always add difficulty, so levels with bigger numbers get
    harder. Times tables are centred on the level average: 7 x 8 is harder and 2 x 5
    easier, but level 1 as a whole stays as hard as before.
    """
    if q.topic in ("addition", "subtraction"):
        return 0.06 * carries(q.a, q.b, q.topic == "subtraction")
    if q.topic == "multiplication" and q.level == 1:
        return _table_difficulty(q.a, q.b) - _MUL_L1_MEAN
    if q.topic == "division" and q.level == 1:
        return FACTOR_DIFFICULTY.get(q.b, 0.0) - _DIV_L1_MEAN
    if q.task_type:
        return TASK_DIFFICULTY[q.task_type]
    return 0.0


def chance_correct(player: Player, q: Question, index: int) -> float:
    p = (player.skill + 0.27 + player.topic_bonus[q.topic]
         - TOPIC_DIFFICULTY[q.topic] - LEVEL_DIFFICULTY[q.level]
         - question_difficulty(q)
         - 0.01 * (index - 1))  # small fatigue effect within a round
    return min(max(p, 0.05), 0.98)


def chance_quit(player: Player, mistakes_in_a_row: int) -> float:
    return (1 - player.persistence) * 0.03 + 0.035 * mistakes_in_a_row


def response_ms(player: Player, q: Question, outcome: str, rng: random.Random) -> int:
    if outcome == "skipped":
        seconds = rng.lognormvariate(math.log(1.5), 0.5)
    else:
        seconds = BASE_SECONDS[q.level] * TOPIC_TIME[q.topic] * player.speed * rng.lognormvariate(0, 0.35)
        if outcome == "wrong":
            seconds *= 0.85  # wrong answers are often rushed
    return int(min(max(seconds * 1000, 300), 600_000))


def new_uuid(rng: random.Random) -> str:
    return str(uuid.UUID(int=rng.getrandbits(128), version=4))


def session_start(day: date, rng: random.Random) -> datetime:
    weights = HOUR_WEIGHTS_WEEKEND if day.weekday() >= 5 else HOUR_WEIGHTS_WEEKDAY
    hour = rng.choices(range(24), weights=weights)[0]
    local = datetime(day.year, day.month, day.day, hour, tzinfo=LOCAL_TZ)
    return (local + timedelta(seconds=rng.uniform(0, 3600))).astimezone(timezone.utc)


def simulate_round(player: Player, topic: str, level: int, start: datetime,
                   rng: random.Random, stats: Counter) -> tuple[list[dict], datetime]:
    session_id = new_uuid(rng)
    events: list[dict] = []
    clock = start
    mistakes_in_a_row = 0
    # Mixed: two of each task type per round, in random order, as in the game.
    tasks = rng.sample(TASK_TYPES * 2, len(TASK_TYPES) * 2) if topic == MIXED else None

    for index in range(1, QUESTIONS_PER_ROUND + 1):
        if index > 1 and rng.random() < chance_quit(player, mistakes_in_a_row):
            stats["rounds_quit"] += 1
            break

        q = make_question(topic, level, rng, tasks[index - 1] if tasks else None)
        p = chance_correct(player, q, index)
        p_skip = 0.02 + 0.10 * (1 - p)
        roll = rng.random()
        if roll < p_skip:
            outcome, given = "skipped", None
        elif roll < p_skip + (1 - p_skip) * p:
            outcome, given = "correct", str(q.answer)
        else:
            value, error_type = make_wrong_answer(q, rng)
            outcome, given = "wrong", str(value)
            stats[f"error:{error_type}"] += 1
        stats[outcome] += 1

        ms = response_ms(player, q, outcome, rng)
        clock += timedelta(milliseconds=ms)
        events.append({
            "event_id": new_uuid(rng),
            "session_id": session_id,
            "source": "simulated",
            "language": player.language,
            "topic": topic,
            "level": level,
            "question_index": index,
            "operand_a": q.a,
            "operand_b": q.b,
            "correct_answer": q.answer,
            "given_answer": given,
            "response_ms": ms,
            "client_ts": clock.isoformat(timespec="milliseconds"),
            "task_type": q.task_type,
            "question_text": q.text,
        })
        clock += timedelta(milliseconds=PAUSE_CORRECT_MS if outcome == "correct" else PAUSE_OTHER_MS)
        mistakes_in_a_row = 0 if outcome == "correct" else mistakes_in_a_row + 1

    stats["rounds"] += 1
    return events, clock


def simulate_day(day: date, players: int, seed: int) -> tuple[list[dict], Counter]:
    rng = random.Random(seed)
    stats: Counter = Counter()
    events: list[dict] = []
    topics = topics_for(day)
    for _ in range(players):
        player = make_player(rng, topics)
        clock = session_start(day, rng)
        favourite = rng.choice(topics)
        rounds = rng.choices([1, 2, 3], weights=[5, 3, 2])[0]
        for _ in range(rounds):
            topic = favourite if rng.random() < 0.6 else rng.choice(topics)
            round_events, clock = simulate_round(player, topic, pick_level(player, rng), clock, rng, stats)
            events.extend(round_events)
            clock += timedelta(seconds=rng.uniform(5, 40))
    return events, stats


# ---- Output ---------------------------------------------------------------

def print_summary(day: date, seed: int, players: int, events: list[dict], stats: Counter) -> None:
    answered = stats["correct"] + stats["wrong"] + stats["skipped"]
    pct = lambda n: f"{100 * n / answered:.1f}%" if answered else "0%"
    print(f"Simulated {day} (seed {seed}): {players} players, {stats['rounds']} rounds, {len(events)} answers")
    print(f"  correct {pct(stats['correct'])}  wrong {pct(stats['wrong'])}  skipped {pct(stats['skipped'])}"
          f"  rounds quit early: {stats['rounds_quit']}")
    errors = sorted(((k.split(':', 1)[1], v) for k, v in stats.items() if k.startswith("error:")),
                    key=lambda kv: -kv[1])
    print("  error types: " + ", ".join(f"{k} {v}" for k, v in errors))


def write_csv(path: Path, events: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(events)


# ---- Database -------------------------------------------------------------

def load_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def load_events(events: list[dict]) -> int:
    """Insert events into bronze.answer_events. Returns the number of new rows."""
    import psycopg

    missing = [v for v in ("DBT_HOST", "DBT_USER", "DBT_PASSWORD") if not os.environ.get(v)]
    if missing:
        sys.exit(f"Missing environment variables: {', '.join(missing)}. Fill in .env (see .env.example).")

    cols = ", ".join(COLUMNS)
    with psycopg.connect(
        host=os.environ["DBT_HOST"],
        port=int(os.environ.get("DBT_PORT", "5432")),
        user=os.environ["DBT_USER"],
        password=os.environ["DBT_PASSWORD"],
        dbname=os.environ.get("DBT_DBNAME", "postgres"),
        sslmode="require",
    ) as conn, conn.cursor() as cur:
        # Stage with COPY, then insert in one statement so a re-run skips existing rows.
        cur.execute("create temp table staging (like bronze.answer_events including defaults) on commit drop")
        with cur.copy(f"copy staging ({cols}) from stdin") as copy:
            for event in events:
                copy.write_row([event[c] for c in COLUMNS])
        cur.execute(
            f"insert into bronze.answer_events ({cols}) select {cols} from staging "
            "on conflict (event_id) do nothing"
        )
        return cur.rowcount


# ---- CLI ------------------------------------------------------------------

def main(argv: list[str] | None = None) -> None:
    today = datetime.now(LOCAL_TZ).date()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--date", type=date.fromisoformat, default=today - timedelta(days=1),
                        help="day to simulate, YYYY-MM-DD (default: yesterday, Copenhagen time)")
    parser.add_argument("--players", type=int, default=25, help="number of players (default: 25)")
    parser.add_argument("--seed", type=int, help="random seed (default: derived from the date)")
    parser.add_argument("--dry-run", action="store_true", help="do not write to the database")
    parser.add_argument("--out", type=Path, help="also write the events to this CSV file")
    args = parser.parse_args(argv)

    if args.date >= today:
        parser.error(f"--date must be before today ({today}), so no answer gets a future timestamp")
    if args.players < 1:
        parser.error("--players must be at least 1")

    seed = args.seed if args.seed is not None else int(args.date.strftime("%Y%m%d"))
    events, stats = simulate_day(args.date, args.players, seed)
    print_summary(args.date, seed, args.players, events, stats)

    if args.out:
        write_csv(args.out, events)
        print(f"  wrote {args.out}")
    if args.dry_run:
        print("  dry run: nothing written to the database")
        return

    load_env()
    inserted = load_events(events)
    print(f"  inserted {inserted} new rows into bronze.answer_events ({len(events) - inserted} already there)")


if __name__ == "__main__":
    main()
