# Game: Math Trail

A single `index.html` with no dependencies and no build step. Open it in a browser to play.

## What it does

- Ages 8–12. Topics: addition, subtraction, multiplication, division. 3 levels each.
- Rounds of 10 questions. The player types the answer, or skips.
- DA/EN toggle. The default follows the browser language.
- A "Behind the scenes" panel shows the events sent from this visit.

| Level | Addition / subtraction | Multiplication | Division |
|---|---|---|---|
| 1 | within 100 | times tables 2–10 | inverse times tables |
| 2 | within 500 | 2-digit × 1-digit (11–20 × 2–9) | ÷ 1-digit, answers 11–25 |
| 3 | within 1000 | 2-digit × 2-digit (11–30 × 11–20) | ÷ 2-digit (11–20), answers 2–20 |

Division questions are built backwards from divisor × answer, so the answer is always a whole number.

## Event tracking

Each answer or skip sends one row to `bronze.answer_events` through the Supabase REST API:

- `POST /rest/v1/answer_events` with headers `Content-Profile: bronze` and `Prefer: return=minimal`.
- Authenticated with the publishable key, which may only insert (see `supabase/`).
- `session_id` is a new random UUID per round. No name, age, login or IP address is stored.
- `given_answer` is the raw typed digits; `NULL` means skipped.
- `response_ms` is the time from showing the question to answering.
- Stopping a round sends nothing. The last `question_index` in a session shows where the player gave up.
- Sending never blocks the game. A failed send is retried twice.

## Installable app (PWA)

The game is a Progressive Web App: it can be installed on a phone, tablet or computer
and opens full screen like an app, also without a connection.

| File | Role |
|---|---|
| `manifest.webmanifest` | Name, colours, icons and full-screen display |
| `sw.js` | Service worker: caches the game's own files (stale-while-revalidate). The dashboard, dbt docs and the answer events are never cached |
| `icons/` | App icons, including a maskable icon for Android and an Apple touch icon |

- **Chrome, Edge, Android:** an "Install app" button appears on the start screen.
- **iPhone and iPad:** the start screen shows how to install by hand (Share, then Add to Home Screen).
- **Offline answers** are kept in `localStorage` and sent when the device is online again.
  A resend can create a duplicate if the first request did arrive; silver deduplicates per
  session and question, so that is safe. Answers the database rejects (4xx) are dropped.

When you change any cached file, bump `CACHE` in `sw.js` so installed apps fetch the new version.
The service worker only runs over http(s), not when `index.html` is opened from disk.

## Requires

`bronze` must be listed under Supabase **Project Settings > Data API > Exposed schemas**.
Without it, the API answers `PGRST106 Invalid schema: bronze` and no events are saved.
