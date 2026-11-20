# Simulator

Generates one day of realistic simulated players and loads their answers into
`bronze.answer_events` with `source = 'simulated'`, over a direct Postgres connection.

```bash
python simulator/simulate.py --dry-run                 # summary only, writes nothing
python simulator/simulate.py                           # load yesterday (Copenhagen time)
python simulator/simulate.py --date 2026-11-19 --players 40
python simulator/simulate.py --dry-run --out sample.csv
```

## Files

| File | Role |
|---|---|
| `questions.py` | Question generation. Mirrors `makeQuestion()` in `game/index.html`: keep them in sync. |
| `errors.py` | Wrong-answer models, one per error type. |
| `simulate.py` | Players, rounds, timing, database load and CLI. |
| `tests/` | `pytest` tests: question maths, error models, determinism, DB constraints. |

## How players behave

- **Players** get a skill level, a per-topic strength, a speed, a persistence and a language (70% Danish).
- **Chance of a correct answer** falls with topic (division is hardest), level and a small fatigue effect within a round.
- **Wrong answers** follow an error type, weighted per topic:

  | Error type | Example | Topics |
  |---|---|---|
  | `carry_borrow` | 47 + 38 → 75, 52 − 17 → 45 | +, − |
  | `off_by_one` | 56 → 57 | all |
  | `reversed_digits` | 56 → 65 | all |
  | `wrong_operation` | 7 × 8 → 15 | all |
  | `table_neighbor` | 7 × 8 → 49 | × |
  | `random` | a guess, sometimes with an extra digit | all |

- **Skips** are more likely on hard questions and are answered fast.
- **Quitting:** players may stop a round early, more often after several mistakes in a row.
- **Timing:** answer time grows with level and topic. Sessions start by hour of day: weekdays peak after school (15–19), weekends are flatter.

## Idempotent runs

The random seed comes from the date (`--seed` overrides it), so a re-run creates the
same event IDs. Rows are staged with `COPY` and inserted with `ON CONFLICT (event_id) DO NOTHING`,
so running the same day twice adds nothing. Only past days are allowed, so no answer gets a future timestamp.

## Connection

Reads `DBT_HOST`, `DBT_PORT`, `DBT_USER`, `DBT_PASSWORD` and `DBT_DBNAME` from `.env`
(see `.env.example`) or the environment. Use the Supabase **session pooler** connection
details. The table owner bypasses RLS, so the `source = 'real'` rule only applies to the browser.
