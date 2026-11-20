-- One row per round (session) of up to {{ var("questions_per_round") }} questions.
-- Topic and level are fixed within a round. Language can be switched mid-round,
-- so the language of the first answer is used.

with answers as (

    select * from {{ ref('answers') }}

),

first_answer as (

    select distinct on (session_id)
        session_id,
        source,
        language,
        topic,
        level,
        rules_version
    from answers
    order by session_id, question_index

),

totals as (

    select
        session_id,
        min(answered_at) as started_at,
        max(answered_at) as ended_at,
        count(*) as answers,
        count(*) filter (where outcome = 'correct') as correct_answers,
        count(*) filter (where outcome = 'wrong') as wrong_answers,
        count(*) filter (where outcome = 'skipped') as skipped_answers,
        max(question_index) as last_question_index,
        round(avg(response_ms))::int as avg_response_ms,
        bool_or(is_too_fast) as has_too_fast_answers
    from answers
    group by session_id

)

select
    f.session_id,
    f.source,
    f.language,
    f.topic,
    f.level,
    f.rules_version,
    t.started_at,
    t.ended_at,
    (t.started_at at time zone 'Europe/Copenhagen')::date as session_date_local,
    extract(epoch from t.ended_at - t.started_at)::int as duration_seconds,
    t.answers,
    t.correct_answers,
    t.wrong_answers,
    t.skipped_answers,
    round(t.correct_answers::numeric / t.answers, 3) as correct_rate,
    t.last_question_index,
    t.last_question_index >= {{ var("questions_per_round") }} as is_completed,
    -- The question the player gave up after, if they stopped early.
    case when t.last_question_index < {{ var("questions_per_round") }} then t.last_question_index end as quit_after_question,
    t.avg_response_ms,
    t.has_too_fast_answers
from first_answer f
join totals t using (session_id)
