# Supabase

| | |
|---|---|
| Project | `math-learning-analytics` |
| Project ref | `fmyqoyzpafqthksfpdcn` |
| API URL | https://fmyqoyzpafqthksfpdcn.supabase.co |
| Region | eu-central-1 (Frankfurt) |
| Plan | Free |

The project URL and the publishable (anon) key are public by design: the game uses them in the browser.
The database password and the service role key are secrets. They go in `.env` locally and in GitHub secrets for CI, never in the repo.

## Migrations

Files in `migrations/` are applied in order with the Supabase SQL editor.

| File | Applied | Verified |
|---|---|---|
| `0001_bronze_answer_events.sql` | 2026-11-20 | RLS on; anon can insert 11 columns only; anon select and insert of `source` are denied; security advisor clean |

## Required dashboard setting

The game writes through the REST API, which only serves exposed schemas.
Add `bronze` under **Project Settings > Data API > Exposed schemas**.

## Notes for the game

- Insert without asking for the row back. With supabase-js, call `.insert(...)` without `.select()`; anon has no select right, so a returning insert fails.
- Do not send `source`, `event_id` or `received_at`. The database sets them.
