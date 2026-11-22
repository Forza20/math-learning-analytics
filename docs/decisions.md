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
| 7 | Dashboard tool | Own static page: gold marts exported to `data.js` nightly, Chart.js, GitHub Pages (changed from Evidence.dev, see below) | Instant load (no cold start), no account, no database keys in the browser. |
| 8 | Content | Ages 8–12 (changed from 6–10, see below); +, −, ×, ÷; 3 levels; typed answers | Typed answers let silver classify error types, not just right or wrong. |
| 9 | Data | Real and simulated, anonymous session ID, insert-only RLS, CHECK constraints, spam test | Connects game and pipeline without collecting children's personal data. |
| 10 | Done means | See below | |
| 11 | Language | English in code, docs and dashboard; game UI Danish only (changed from a DA/EN toggle, see below) | Widest audience; toggle is cheap and adds a dimension. |

## Done means (v1)

1. Game and dashboard each have a public link that works without login.
2. The nightly GitHub Actions run has been green 7 nights in a row.
3. Every gold model has dbt tests, and `dbt docs` with lineage is published.
4. The README shows the architecture, both links and a GIF of the game.
5. Every layer and design choice can be explained without AI.
6. A LinkedIn post with a short video and links (changed to the introduction video, see below).

## Changes

**2026-11-20: target age 6–10 changed to 8–12.** Levels now go up to numbers within 1000,
2-digit × 2-digit multiplication and division by 2-digit numbers.
Harder questions give more varied errors (carrying, place value) for silver to classify.
The 20 events received before this change were played under the old levels.
Silver must not compare them with later events by level: filter them out by `received_at`.

**2026-11-20: Evidence.dev replaced by an own static dashboard.** Evidence's current version
runs as a hosted product (Evidence Studio) that needs an account, and its open-source static
build has not been updated since February 2026. A small Python export plus one Chart.js page
keeps every original reason for the choice (instant load, static hosting, no keys in the browser)
without depending on a frozen tool.

**2026-11-20: six weeks of simulated history loaded** (2026-10-09 to 2026-11-18), so every
topic and level has enough answers for the dashboard.

**2026-11-20: simulator made more realistic, and the simulated history reloaded.** Each carry
or borrow now makes a sum harder, and the 6–9 times tables are harder than 2, 5 and 10 (centred,
so each level's average is unchanged). Without this the times-tables chart was flat and told no
story. Because the change alters the random sequence, a re-run would have created new event IDs
next to the old rows, so all `source = 'simulated'` rows were deleted from bronze and the days
were loaded again. This is the one deliberate exception to "bronze is never changed": the rows
were generated, not received, and the simulator recreates them exactly. Real rows were untouched.

**2026-11-20: the game became an installable app (PWA).** The brief said "app", which the
first interview never pinned down: the game was a web page. A PWA makes it installable on a
phone and playable offline, with no app store, no cost and no change to the pipeline, while a
headhunter can still just click the link. A native app was rejected: weeks of work, a yearly
Apple fee, store review for a children's app, and reviewers would have to install it.
Offline answers are queued and sent later; silver's deduplication makes resends safe.

**2026-11-22: a fifth topic, mixed puzzles.** Decision 8 limited the content to +, −, ×, ÷.
To match what the child meets in school worksheets, a fifth topic "Mixed" (DA "Blandet") adds
five task types: number sequences, unit conversion, symbol puzzles, price puzzles and fruit grids.
The puzzles are written for the game in the worksheets' style; no worksheet content is copied.
- A separate topic, not mixed into the four others, so their data stays comparable over time.
- Migration `0002` adds topic `mixed` and two columns: `task_type` and `question_text`
  (printable ASCII, at most 80 characters, so the browser cannot store arbitrary text).
  `operand_a` and `operand_b` keep a fixed meaning per task type, so silver classifies
  errors without parsing text. Existing rows are unchanged.
- New error type `unit_slip` (a power-of-ten slip in a unit conversion). `wrong_operation`
  and `table_neighbor` gained rules for the puzzle types. New mart `mart_task_types`.
- Answers stay whole and non-negative, so the keypad needs no minus or comma key.
  Negative sequences from the worksheets were left out for that reason.
- The simulator plays mixed rounds only from 2026-11-22, so re-running earlier days
  still recreates exactly the same rows (verified with a fingerprint of three old days).

**2026-11-22: the game is Danish only, and Dansk became multiple choice.** Changes decision 11.
- The DA/EN toggle and all English game text were removed: the game is for Danish children at
  mellemtrin. Code, docs and the dashboard stay in English. New events always carry
  `language = 'da'`; older events keep their language, so bronze and dbt are unchanged.
- Dansk no longer asks the player to type the word. Each obstacle shows three spellings, one
  right and two typical misspellings (hand-written per word, none of them a Danish word),
  and the player picks the right one. Still game only, never sent.

**2026-11-22: two subjects, Matematik and Dansk, and a dinosaur reward.** The start screen
now offers only two subjects, the two the game is built around for mellemtrin.
- **Matematik** replaces the five topic buttons. One course mixes them: two each of +, −, ×, ÷
  and two mixed puzzles. Each event still carries its own `topic`, so the bronze schema, the
  simulator and the per-answer dbt models are unchanged and old and new rows stay comparable.
  Known gap: `silver.sessions` takes a session's topic from its first answer, so for new real
  rounds the session-level topic (and `mart_dropoff`) is only the first question's topic.
- **Dansk** is spelling only: look at a word, it is covered, then type it on a Danish letter
  keyboard. 60 words in three levels. This extends decision 8 (math only) for the game, but not
  for the pipeline: spelling answers are checked in the game and never sent, so no migration.
- **Reward**: after every finished course the end screen shows a dinosaur with a pizza and heart
  sunglasses, drawn as SVG in code (no image file).
- Best times are kept per subject and level; old per-topic best times are no longer shown.

**2026-11-22: sound in the game.** To make the course more fun for a child: looping background
music from the start of a round, and one sound each for a right answer, a wrong or skipped answer,
moving on to the next obstacle, and reaching the goal. The style is retro 8-bit platform games
(pulse and triangle waves); every melody is original. Choices made along the way:
- Sound is made in code with the Web Audio API (`game/sound.js`), not sound files: nothing to
  download or license, it works offline with one extra cached file, and the 8-bit style is
  exactly what simple oscillators produce.
- A mute button on the course; the choice stays in `localStorage` and is never sent.
- Sound pauses when the app goes to the background. No change to events, bronze or dbt.

**2026-11-22: the round became a timed obstacle course.** To make the game more fun for a child,
the 10 questions are now 10 obstacles on a street course, and the goal is the fastest time.
A wrong answer adds 10 seconds; a skip counts as wrong. The look is inspired by blocky Roblox
town games: bright flat colours, thick outlines and a block-figure runner, drawn in CSS and SVG
with no copied assets or names. Choices made along the way:
- No retry after a wrong answer: the game moves on, so each question still sends exactly one
  event and silver's one-row-per-question deduplication stays valid. The event schema, the
  questions and the levels are unchanged, so no migration and no change to dbt.
- The clock only counts time while a question is on screen. Animations do not cost time, so
  `response_ms` and the course time measure the same thing.
- An on-screen keypad replaces the phone keyboard, which covered half the course on a phone.
- Best times stay in `localStorage` on the device and are never sent.
- The game keeps one daytime theme, also in dark mode.
The introduction video (`video/`) still shows the old quiz screen.

**2026-11-20: introduction video instead of a recorded demo.** A 40-second square video made in
code with Remotion (`video/`), so no one has to appear on camera. The local disk had too little
space for Remotion and a headless Chrome, so the `video` workflow renders it on GitHub's servers
and also exports the GIF in the README.

## Out of scope for v1

Power BI, logins, more data sources, polished game design.

## Plan

1. Week 1: game with event tracking, Supabase tables and access rules.
2. Week 2: Python simulator, dbt bronze and silver (error types).
3. Week 3: dbt gold and tests, nightly GitHub Actions run.
4. Week 4: dashboard, README, `dbt docs`, demo video, LinkedIn post.
