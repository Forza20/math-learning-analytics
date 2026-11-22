# dbt

Transforms `bronze.answer_events` into the `silver` and `gold` schemas in Supabase Postgres.

```powershell
.\dbt.ps1 build                    # from the repo root: loads .env, runs models and tests
.\dbt.ps1 build --select silver
.\dbt.ps1 build --select gold
```

Seeds (`seeds/`) are loaded into `silver` and feed the gold dimensions.

## Silver

| Model | Grain | What it adds |
|---|---|---|
| `silver.answers` | one answer | Deduplication, typed answer, outcome, error type, local time, `rules_version`, quality flags |
| `silver.sessions` | one round | Totals per round, correct rate, duration, completed or quit after which question |

**Deduplication.** `event_id` is set by the database, so a browser retry after a lost
response is stored twice with different IDs. Silver keeps the first copy per
`(session_id, question_index)`.

**Error classification.** Wrong answers get the first matching type:

| Order | `error_type` | Rule | Example |
|---|---|---|---|
| 1 | `off_by_one` | differs by 1 | 56 → 57 |
| 2 | `carry_borrow` | column-by-column without carrying or borrowing (+, −) | 47 + 38 → 75 |
| 3 | `reversed_digits` | digits of the answer reversed | 56 → 65 |
| 4 | `wrong_operation` | another operation on the same numbers; for mixed puzzles a sequence in the wrong direction, adding instead of halving, or rows + columns | 7 × 8 → 15 |
| 5 | `table_neighbor` | one factor off by one (×, fruit grids) | 7 × 8 → 49 |
| 6 | `unit_slip` | a unit conversion off by a power of ten (mixed) | 3 km → 300 m |
| 7 | `implausible` | more digits than the answer and over twice its size | 956 → 4547 |
| 8 | `other` | none of the above | |

The simulator records which error it intended, so the classifier can be checked
against it: on the first simulated day, every systematic type came back within a few
answers of the intended count. The simulator's `random` guesses land in `implausible`,
`other` or, by chance, `off_by_one`.

**Mixed puzzles.** Topic `mixed` (from 2026-11-22) has a `task_type` and a `question_text`.
`operand_a` and `operand_b` keep a fixed meaning per task type, listed in
`supabase/migrations/0002_mixed_topic.sql`, so the rules above need no text parsing.

**Rules version.** The game's levels changed for ages 8–12 at `var('rules_v2_from')`.
Earlier events have `rules_version = 1` and must not be compared by level with later ones.

## Gold

A star schema plus small marts that the dashboard reads directly. All are tables.

```
                 dim_date
                    │ date_key
dim_exercise ── fct_answers ── dim_error_type
   exercise_key     │ session_id
                fct_sessions ── dim_date, dim_exercise
```

| Model | Grain | Notes |
|---|---|---|
| `dim_date` | Copenhagen day | From the first answer to today |
| `dim_exercise` | topic and level | Labels and descriptions, from seed `exercise_levels.csv` |
| `dim_error_type` | error type | Labels, examples, rule order, from seed `error_types.csv` |
| `fct_answers` | answer | `is_analysable` = rules version 2 and no quality flags; `times_table` for level 1 × and ÷ |
| `fct_sessions` | round | Same `is_analysable` rule |
| `mart_difficulty` | source, topic, level | Correct, wrong and skip rates; median and p90 answer time |
| `mart_errors` | source, topic, level, error type | Count and share of wrong answers |
| `mart_times_tables` | source, topic, table 2–10 | Correct rate and median time per times table |
| `mart_dropoff` | source, topic, level, question 1–10 | Share of rounds reaching each question, quits, accuracy by question |
| `mart_daily_activity` | day, source | Sessions, answers, rates; days without play included |
| `mart_task_types` | source, task type, level | Correct, wrong and skip rates and median time for mixed puzzles |

Marts use analysable rows only. The facts keep every row, so excluded data stays traceable.

## Tests

- Generic tests on keys, accepted values and every fact → dimension relationship.
- Unit tests for the error rules, deduplication and `rules_version` (`_silver.yml`), and the drop-off counts (`_gold.yml`), on fixed input rows.
- `assert_error_type_only_on_wrong_answers`, `assert_one_answer_per_question`.
- `assert_gold_marts_reconcile`: mart totals must equal the facts they summarise.
- `assert_no_spam_bursts` (warning): busy hours of real answers, or real sessions with machine-speed answers.
