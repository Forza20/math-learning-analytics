-- Bronze layer: one row per answer a player gives in the game.
-- The public game writes here with the anon key. The simulator writes with a
-- direct Postgres connection, which bypasses RLS.

create schema if not exists bronze;

create table if not exists bronze.answer_events (
    event_id        uuid        primary key default gen_random_uuid(),
    session_id      uuid        not null,
    source          text        not null default 'real'
                                check (source in ('real', 'simulated')),
    language        text        not null check (language in ('da', 'en')),
    topic           text        not null
                                check (topic in ('addition', 'subtraction', 'multiplication', 'division')),
    level           smallint    not null check (level between 1 and 3),
    question_index  smallint    not null check (question_index between 1 and 500),
    operand_a       integer     not null check (operand_a between 0 and 1000),
    operand_b       integer     not null check (operand_b between 0 and 1000),
    correct_answer  integer     not null check (correct_answer between 0 and 1000000),
    -- Raw typed input. NULL means the player skipped the question.
    given_answer    text        check (char_length(given_answer) <= 10),
    response_ms     integer     not null check (response_ms between 0 and 600000),
    client_ts       timestamptz not null,
    received_at     timestamptz not null default now()
);

create index if not exists answer_events_received_at_idx
    on bronze.answer_events (received_at);

-- Security: the browser may insert, and nothing else.
alter table bronze.answer_events enable row level security;

revoke all on bronze.answer_events from anon, authenticated;
grant usage on schema bronze to anon;

-- Column-level grant: anon cannot set event_id, source or received_at,
-- so real players cannot pose as simulated data or fake the server time.
grant insert (
    session_id, language, topic, level, question_index,
    operand_a, operand_b, correct_answer, given_answer, response_ms, client_ts
) on bronze.answer_events to anon;

drop policy if exists anon_insert_real on bronze.answer_events;
create policy anon_insert_real
    on bronze.answer_events
    for insert
    to anon
    with check (source = 'real');
-- No select, update or delete policies: anon cannot read or change any row.
