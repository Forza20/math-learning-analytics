# Dashboard

A static page that shows the gold marts: one `index.html` with Chart.js, plus a
`data.js` file generated every night.

```bash
python dashboard/export.py        # reads .env, writes dashboard/data.js
python -m http.server -d dashboard 8765   # then open http://127.0.0.1:8765/
```

`data.js` sets `window.DASHBOARD_DATA` and is loaded with a `<script>` tag, so the page
also works when opened straight from disk. It is generated, so it is not committed.

## What it shows

| Section | Source | Question |
|---|---|---|
| Key figures | `fct_sessions` | How much play, how often correct, how many rounds finished |
| Correct answers by topic and level | `mart_difficulty` | Which topics and levels are hardest? |
| Time to answer | `mart_difficulty` | How does answer time grow with level? |
| What kind of mistakes | `mart_errors`, `dim_error_type` | Which error types dominate per topic? |
| Times tables | `mart_times_tables` | Which tables are hardest? |
| How far players get | `mart_dropoff` | Where in a round do players give up? |
| Rounds per day | `mart_daily_activity` | Is the pipeline running, and when do players play? |

A filter switches between simulated and real players. Every chart has a table view.

## Design

- **No database access from the browser.** The export runs in GitHub Actions with the
  database secrets; the published page only holds aggregated numbers.
- **Colours** follow a validated categorical palette (colour-blind safe on adjacent pairs,
  separate light and dark steps). Levels use a one-hue ramp, light to dark.
- **Why not Evidence.dev:** the original plan. In 2026 Evidence moved to a hosted product
  that needs an account, and the open-source static build stopped being updated. See
  `docs/decisions.md`.
