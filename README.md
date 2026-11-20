# Math Learning Analytics

A small math game for children aged 6–10, and the data platform behind it.
Every answer becomes an event that flows through a tested nightly pipeline
into a public dashboard about learning and error patterns.

The game is the data source. The pipeline is the point.

> **Status:** setting up (week 1 of 4). Links to the live game and dashboard come here.

## Architecture

```
Game (GitHub Pages) ──insert──► Supabase  bronze.answer_events
Python simulator ─────insert──►           │
                                          ▼  GitHub Actions (nightly)
                            dbt build: bronze → silver → gold
                                          ▼
                            Evidence.dev build ──► GitHub Pages dashboard
```

| Layer | Tool | Folder |
|---|---|---|
| Game | Single `index.html`, GitHub Pages | [game/](game/) |
| Ingest | Supabase Postgres, insert-only RLS | [supabase/](supabase/) |
| Simulated players | Python | [simulator/](simulator/) |
| Transformations and tests | dbt Core (bronze, silver, gold) | [dbt/](dbt/) |
| Orchestration | GitHub Actions | [.github/workflows/](.github/workflows/) |
| Dashboard | Evidence.dev | [dashboard/](dashboard/) |

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
pip install -r requirements.txt
cp .env.example .env             # fill in Supabase connection details
dbt debug --project-dir dbt --profiles-dir dbt
```

## Design decisions

Every choice and the reason for it: [docs/decisions.md](docs/decisions.md).
