# Math Learning Analytics

A small math game for children aged 8–12, and the data platform behind it.
Every answer becomes an event that flows through a tested nightly pipeline
into a public dashboard about learning and error patterns.

The game is the data source. The pipeline is the point.

<img src="docs/game.gif" width="360" alt="A round of the game: each answer appears as a JSON event on its way to Postgres">

**Live:** [Play the game](https://forza20.github.io/math-learning-analytics/) ·
[Dashboard](https://forza20.github.io/math-learning-analytics/dashboard/) ·
[Data model and lineage (dbt docs)](https://forza20.github.io/math-learning-analytics/dbt-docs/)

## What's in it

- **An installable app (PWA)** that works offline: answers given without a connection are queued and sent later.
- **An event stream I designed myself**: the game sends one row per answer to Postgres. The browser may insert, nothing else.
- **A simulator** for realistic players, with seven error types, tested with `pytest` and idempotent per day.
- **A dbt medallion**: silver deduplicates retried events and classifies every wrong answer into an error type; gold is a star schema plus marts. About 50 tests, including unit tests and a reconciliation check.
- **A nightly GitHub Actions run** that simulates, builds, tests and publishes everything.
- **A static dashboard** with no database access from the browser.

## Architecture

```
Game (GitHub Pages) ──insert──► Supabase  bronze.answer_events
Python simulator ─────insert──►           │
                                          ▼  GitHub Actions (nightly)
                            dbt build: bronze → silver → gold
                                          ▼
                            export gold marts ──► GitHub Pages
                                                  (game, dashboard, dbt docs)
```

| Layer | Tool | Folder |
|---|---|---|
| Game | Installable web app (PWA), GitHub Pages | [game/](game/) |
| Ingest | Supabase Postgres, insert-only RLS | [supabase/](supabase/) |
| Simulated players | Python | [simulator/](simulator/) |
| Transformations and tests | dbt Core (bronze, silver, gold) | [dbt/](dbt/) |
| Orchestration | GitHub Actions | [.github/workflows/](.github/workflows/) |
| Dashboard | Static page, Chart.js, data exported nightly | [dashboard/](dashboard/) |

## Privacy

No real personal data is collected. Players are anonymous: a random session ID,
no name, age, login or IP address. Most data comes from simulated players, and
every row is tagged `source = 'real'` or `'simulated'`.

The browser can only insert rows, and only into allowed columns. It cannot read,
change or delete data, and it cannot label its rows as simulated.
See [0001_bronze_answer_events.sql](supabase/migrations/0001_bronze_answer_events.sql).

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env             # fill in Supabase connection details
pytest                           # simulator tests
python simulator/simulate.py --dry-run
dbt debug --project-dir dbt --profiles-dir dbt
```

On Windows, `.\dbt.ps1 build` loads `.env` and runs dbt with the right folders.
See [dbt/README.md](dbt/README.md) for the models and tests.

## Design decisions

Every choice and the reason for it: [docs/decisions.md](docs/decisions.md).
Short answers to the obvious questions ("isn't a browser writing to Postgres unsafe?"):
[docs/faq.md](docs/faq.md).
