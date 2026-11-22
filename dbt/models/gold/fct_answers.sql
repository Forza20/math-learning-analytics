-- Fact: one row per answer. Joins to dim_date, dim_exercise and dim_error_type.
-- is_analysable marks the rows the dashboard uses: current game rules and no quality flags.

select
    a.event_id,
    a.session_id,
    to_char(a.answer_date_local, 'YYYYMMDD')::int as date_key,
    a.topic || '_' || a.level as exercise_key,
    a.error_type,

    a.source,
    a.language,
    a.topic,
    a.task_type,
    a.question_text,
    a.level,
    a.rules_version,
    a.question_index,
    a.operand_a,
    a.operand_b,
    a.correct_answer,
    a.given_answer,
    a.outcome,
    -- The times table a basic question belongs to: the larger factor for
    -- level 1 multiplication, the divisor for level 1 division.
    case
        when a.topic = 'multiplication' and a.level = 1 then greatest(a.operand_a, a.operand_b)
        when a.topic = 'division' and a.level = 1 then a.operand_b
    end as times_table,

    a.answered_at,
    a.answered_at_local,
    a.answer_hour_local,

    -- Measures
    a.is_correct::int as correct_count,
    (a.outcome = 'wrong')::int as wrong_count,
    (a.outcome = 'skipped')::int as skipped_count,
    a.response_ms,

    a.rules_version = 2 and not a.is_too_fast and not a.is_clock_skewed as is_analysable
from {{ ref('answers') }} a
