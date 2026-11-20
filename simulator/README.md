# Simulator

Python script that generates realistic simulated players and writes them to
`bronze.answer_events` with `source = 'simulated'` over a direct Postgres connection.

Planned (week 2):
- Player profiles with different skill per topic and level.
- Realistic error types: off by one, reversed digits, wrong operation, skips.
- Response times that grow with level.
- Runs nightly in GitHub Actions before `dbt build`.
