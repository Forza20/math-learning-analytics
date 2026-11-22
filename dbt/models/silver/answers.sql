-- One row per answered or skipped question, cleaned and classified.

with source as (

    select * from {{ source('bronze', 'answer_events') }}

),

-- event_id is set by the database, so a request the browser retried after a
-- lost response arrives twice with different IDs. Keep the first copy of each
-- question in a session.
deduplicated as (

    select
        *,
        row_number() over (
            partition by session_id, question_index
            order by received_at, event_id
        ) as copy_number
    from source

),

typed as (

    select
        event_id,
        session_id,
        source,
        language,
        topic,
        -- Set for topic 'mixed' only (from 2026-11-22). The meaning of operand_a and
        -- operand_b per task type is listed in supabase/migrations/0002_mixed_topic.sql.
        task_type,
        question_text,
        -- Set for topic 'spelling' only (from 2026-11-22): the correct spelling.
        -- given_answer is then the spelling the player picked of three. See
        -- supabase/migrations/0003_spelling_topic.sql.
        word,
        level,
        question_index,
        operand_a,
        operand_b,
        correct_answer,
        given_answer as given_answer_raw,
        case when given_answer ~ '^[0-9]{1,10}$' then given_answer::bigint end as given_answer,
        response_ms,
        client_ts as answered_at,
        client_ts at time zone 'Europe/Copenhagen' as answered_at_local,
        received_at,
        case
            when received_at >= '{{ var("rules_v2_from") }}'::timestamptz then 2
            else 1
        end as rules_version
    from deduplicated
    where copy_number = 1

),

with_outcome as (

    select
        *,
        case
            when given_answer_raw is null then 'skipped'
            when topic = 'spelling' then case when given_answer_raw = word then 'correct' else 'wrong' end
            when given_answer = correct_answer then 'correct'
            else 'wrong'
        end as outcome
    from typed

)

select
    event_id,
    session_id,
    source,
    language,
    topic,
    task_type,
    question_text,
    word,
    level,
    rules_version,
    question_index,
    operand_a,
    operand_b,
    correct_answer,
    given_answer_raw,
    given_answer,
    outcome,
    outcome = 'correct' as is_correct,

    -- First matching rule wins, so the order is part of the definition.
    case when outcome = 'wrong' then
        case
            -- Spelling has one error type: the player picked a misspelling.
            when topic = 'spelling'
                then 'misspelling'
            when abs(given_answer - correct_answer) = 1
                then 'off_by_one'
            when topic = 'addition'
                and given_answer = {{ column_digits('operand_a', 'operand_b', 'add_no_carry') }}
                then 'carry_borrow'
            when topic = 'subtraction'
                and given_answer = {{ column_digits('operand_a', 'operand_b', 'sub_no_borrow') }}
                then 'carry_borrow'
            when correct_answer >= 10
                and given_answer = reverse(correct_answer::text)::bigint
                then 'reversed_digits'
            when (topic = 'addition' and given_answer in (abs(operand_a - operand_b), operand_a * operand_b))
                or (topic = 'subtraction' and given_answer = operand_a + operand_b)
                or (topic = 'multiplication' and given_answer = operand_a + operand_b)
                or (topic = 'division' and given_answer in (operand_a - operand_b, operand_a * operand_b))
                -- Mixed puzzles: went the wrong way in a sequence (16, 12, 8, 4 -> 0),
                -- added instead of halving or subtracting, used the count instead of
                -- dividing by it, or added rows and columns.
                or (task_type = 'sequence' and given_answer = 2 * operand_a - correct_answer)
                or (task_type = 'symbol' and given_answer = operand_a + operand_b)
                or (task_type = 'price' and given_answer in (operand_a - operand_b, operand_a + operand_b))
                or (task_type = 'array' and given_answer = operand_a + operand_b)
                then 'wrong_operation'
            when (topic = 'multiplication' or task_type = 'array')
                and given_answer in (
                    operand_a * (operand_b - 1), operand_a * (operand_b + 1),
                    (operand_a - 1) * operand_b, (operand_a + 1) * operand_b
                )
                then 'table_neighbor'
            -- A unit conversion off by a power of ten: 3 km = 300 m, 200 cm = 20 m.
            when task_type = 'unit'
                and (given_answer = correct_answer * 10 or given_answer * 10 = correct_answer)
                then 'unit_slip'
            -- More digits than the answer and over twice its size: a guess or a stray key.
            when length(given_answer_raw) > length(correct_answer::text)
                and given_answer > 2 * correct_answer
                then 'implausible'
            else 'other'
        end
    end as error_type,

    response_ms,
    response_ms < 250 and outcome <> 'skipped' as is_too_fast,
    answered_at,
    answered_at_local,
    answered_at_local::date as answer_date_local,
    extract(hour from answered_at_local)::int as answer_hour_local,
    received_at,
    -- Real events should arrive within seconds. Simulated days are loaded later by design.
    source = 'real' and abs(extract(epoch from received_at - answered_at)) > 3600 as is_clock_skewed

from with_outcome
