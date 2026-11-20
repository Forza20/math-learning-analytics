# Game: Math Trail

A single `index.html` with no dependencies and no build step. Open it in a browser to play.

## What it does

- Ages 6–10. Topics: addition, subtraction, multiplication, division. 3 levels each.
- Rounds of 10 questions. The player types the answer, or skips.
- DA/EN toggle. The default follows the browser language.
- A "Behind the scenes" panel shows the events sent from this visit.

| Level | Addition / subtraction | Multiplication / division tables |
|---|---|---|
| 1 | within 10 | 1, 2, 5, 10 |
| 2 | within 20 | 3, 4, 6 |
| 3 | within 100 | 7, 8, 9 |

Division questions are always the inverse of a times table, so the answer is a whole number.

## Event tracking

Each answer or skip sends one row to `bronze.answer_events` through the Supabase REST API:

- `POST /rest/v1/answer_events` with headers `Content-Profile: bronze` and `Prefer: return=minimal`.
- Authenticated with the publishable key, which may only insert (see `supabase/`).
- `session_id` is a new random UUID per round. No name, age, login or IP address is stored.
- `given_answer` is the raw typed digits; `NULL` means skipped.
- `response_ms` is the time from showing the question to answering.
- Stopping a round sends nothing. The last `question_index` in a session shows where the player gave up.
- Sending never blocks the game. A failed send is retried twice.

## Requires

`bronze` must be listed under Supabase **Project Settings > Data API > Exposed schemas**.
Without it, the API answers `PGRST106 Invalid schema: bronze` and no events are saved.
