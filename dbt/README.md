# dbt

Transforms `bronze.answer_events` into the `silver` and `gold` schemas in Supabase Postgres.

```powershell
.\dbt.ps1 build                    # from the repo root: loads .env, runs models and tests
.\dbt.ps1 build --select silver
```

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
| 4 | `wrong_operation` | another operation on the same numbers | 7 × 8 → 15 |
| 5 | `table_neighbor` | one factor off by one (×) | 7 × 8 → 49 |
| 6 | `implausible` | more digits than the answer and over twice its size | 956 → 4547 |
| 7 | `other` | none of the above | |

The simulator records which error it intended, so the classifier can be checked
against it: on the first simulated day, every systematic type came back within a few
answers of the intended count. The simulator's `random` guesses land in `implausible`,
`other` or, by chance, `off_by_one`.

**Rules version.** The game's levels changed for ages 8–12 at `var('rules_v2_from')`.
Earlier events have `rules_version = 1` and must not be compared by level with later ones.

## Tests

- Generic tests on keys, accepted values and the answers → sessions relationship.
- Unit tests (`_silver.yml`) for the error rules, deduplication and `rules_version`, on fixed input rows.
- `assert_error_type_only_on_wrong_answers`, `assert_one_answer_per_question`.
- `assert_no_spam_bursts` (warning): busy hours of real answers, or real sessions with machine-speed answers.
