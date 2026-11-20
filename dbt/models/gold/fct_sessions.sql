-- Fact: one row per round.

select
    s.session_id,
    to_char(s.session_date_local, 'YYYYMMDD')::int as date_key,
    s.topic || '_' || s.level as exercise_key,

    s.source,
    s.language,
    s.topic,
    s.level,
    s.rules_version,
    s.started_at,
    s.ended_at,

    -- Measures
    s.answers,
    s.correct_answers,
    s.wrong_answers,
    s.skipped_answers,
    s.correct_rate,
    s.duration_seconds,
    s.avg_response_ms,
    s.last_question_index,
    s.is_completed,
    s.quit_after_question,

    s.rules_version = 2 and not s.has_too_fast_answers and not s.has_clock_skew as is_analysable
from {{ ref('sessions') }} s
