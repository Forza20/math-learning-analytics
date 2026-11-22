# Math Learning Analytics

Portfolio project for data engineer / BI developer roles. Decisions and scope: docs/decisions.md. Do not re-open them without asking.

- Game is 25% of effort, data is 75%. Keep the game simple.
- Never collect personal data about children. Anonymous session ID only.
- Browser writes only via anon key into `bronze.answer_events`, insert-only. Schema changes go in a new file in `supabase/migrations/`.
- dbt project lives in `dbt/`; run with `--project-dir dbt --profiles-dir dbt`. Secrets only via env vars.
- English in code, docs and dashboard. Game UI is Danish only.
