# Design decisions

Decisions made before the build started, with the reason for each.

| # | Topic | Decision | Why |
|---|---|---|---|
| 1 | Target role | Data engineer; BI developer as second | Builds on existing pipeline, modelling and BI work. |
| 2 | Time | 20 hours/week, own target: v1 live within 4 weeks (~80 hours) | One finished, live project beats several half-finished ones. |
| 3 | Concept | The math game is the data source, not the product | Owning the chain from click to KPI shows more than a downloaded dataset. |
| 4 | Time split | 25% game, 75% data | Effort goes where a data engineering reviewer looks. |
| 5 | Stack | GitHub Pages, Supabase Postgres, Python, dbt Core, GitHub Actions | Free tiers; dbt is the most requested transformation tool. |
| 6 | Dashboard | Live web dashboard | Reviewers click a link and give it 30–60 seconds; no login or install. |
| 7 | Dashboard tool | Evidence.dev, static build on GitHub Pages | Instant load (no cold start), SQL-first, no database keys in the browser. |
| 8 | Content | Ages 6–10; +, −, ×, ÷; 3 levels; typed answers | Typed answers let silver classify error types, not just right or wrong. |
| 9 | Data | Real and simulated, anonymous session ID, insert-only RLS, CHECK constraints, spam test | Connects game and pipeline without collecting children's personal data. |
| 10 | Done means | See below | |
| 11 | Language | English throughout; game has a DA/EN toggle | Widest audience; toggle is cheap and adds a dimension. |

## Done means (v1)

1. Game and dashboard each have a public link that works without login.
2. The nightly GitHub Actions run has been green 7 nights in a row.
3. Every gold model has dbt tests, and `dbt docs` with lineage is published.
4. The README shows the architecture, both links and a GIF of the game.
5. Every layer and design choice can be explained without AI.
6. A LinkedIn post with a 1–2 minute demo video and links.

## Out of scope for v1

Power BI, logins, more data sources, polished game design.

## Plan

1. Week 1: game with event tracking, Supabase tables and access rules.
2. Week 2: Python simulator, dbt bronze and silver (error types).
3. Week 3: dbt gold and tests, nightly GitHub Actions run.
4. Week 4: Evidence dashboard, README, `dbt docs`, demo video, LinkedIn post.
