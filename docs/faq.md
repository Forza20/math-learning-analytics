# Design FAQ

Short answers to the questions a reviewer is most likely to ask. The full decision
log with dates is in [decisions.md](decisions.md).

## The idea

**Why build a children's math game for a data engineering portfolio?**
The game is only the data source. It lets the project own the whole chain, from a click
in the browser to a tested KPI, instead of starting from a downloaded dataset. The
interesting part is what happens to the events afterwards.

**Why simulated players?**
A portfolio project has almost no real users, and real data about children would need
parental consent. A simulator gives realistic volume and patterns without personal data.
Every row is tagged `source = 'real'` or `'simulated'`, and the dashboard keeps them apart.

**How realistic is the simulated data?**
Each player has a skill level, per-topic strengths, a speed and a persistence. Accuracy
falls with topic, level, carrying and borrowing, and the harder times tables (6–9).
Wrong answers follow six error types. Players quit more after several mistakes in a row,
and they play mostly after school. It is a model, not real behaviour, and the dashboard says so.

## Ingestion and security

**The browser writes straight to Postgres. Isn't that unsafe?**
The publishable key can do one thing: insert into `bronze.answer_events`. Row Level Security
allows insert only, and a column-level grant leaves out `event_id`, `source` and `received_at`,
so a visitor cannot read data, change rows, fake the server time or label rows as simulated.
`CHECK` constraints reject values the game can never send.

**What stops someone spamming the table?**
Nothing stops the inserts themselves; that is the trade-off of a backend-free game. The
pipeline protects the analysis instead: silver flags answers faster than 250 ms and clocks
that are an hour off, gold excludes flagged rows, and a dbt test warns on unusual bursts.
If it became a real problem, the next step would be an edge function with rate limiting.

**Why no name, age or IP address?**
They are not needed for any question the dashboard answers, and not collecting them is
the simplest way to protect children's data. A random session ID per round is enough.

## Pipeline

**Why medallion layers (bronze, silver, gold)?**
Bronze stays exactly as received, so any bug in a later layer can be fixed and rebuilt.
Silver is where the data becomes trustworthy: deduplicated, typed and classified. Gold is
shaped for questions: a star schema plus small marts.

**Why deduplicate in silver, when `event_id` is a primary key?**
`event_id` is set by the database. If the browser retries a request whose response got lost,
the same answer is stored twice with two different IDs. Silver keeps the first copy per
session and question.

**How are mistakes classified?**
Seven rules in a fixed order; the first match wins: off by one, carry/borrow, reversed digits,
wrong operation, times-table neighbour, implausible, other. Carry and borrow are computed
column by column with integer arithmetic in a dbt macro. Unit tests pin each rule to an example.

**How do you know the classifier works?**
The simulator records which error it intended. On the first simulated day, every systematic
error type came back within a few answers of the intended count.

**What happened when the game's levels changed?**
The target age moved from 6–10 to 8–12, so "level 1" means something different before and
after. Silver adds `rules_version` from a cut-off time, and gold only analyses version 2.
The old rows stay in the facts, so nothing is silently deleted.

**Why is the simulator idempotent?**
The random seed comes from the date, so a re-run creates the same event IDs, and the load
uses `ON CONFLICT DO NOTHING`. A failed night can simply be run again.

**What do the tests cover?**
About 50 dbt tests: keys, accepted values, every fact-to-dimension relationship, unit tests
on fixed rows for the classifier, deduplication, `rules_version` and drop-off counts, and a
reconciliation test that every mart adds up to its fact table. The simulator has its own
`pytest` suite.

## Serving

**Why a static dashboard instead of a BI tool?**
The plan was Evidence.dev, but it moved to a hosted product that needs an account. A Python
export plus one Chart.js page loads instantly, costs nothing, and never exposes the database:
the browser only gets aggregated numbers.

**Why GitHub Actions and not Airflow?**
One linear job per night does not need a scheduler cluster. Actions gives scheduling,
secrets, logs and Pages deployment for free. If the pipeline grew branches or backfills,
an orchestrator would earn its place.

**What would you do next with more time?**
Incremental dbt models for bronze-to-silver, source freshness alerts, an edge function with
rate limiting in front of the insert, and per-player difficulty in the game itself.
