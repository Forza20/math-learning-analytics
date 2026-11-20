-- Dashboard: where in a round do players give up?
-- One row per source, topic, level and question number 1..{{ var("questions_per_round") }}.

with sessions as (

    select * from {{ ref('fct_sessions') }} where is_analysable

),

questions as (

    select generate_series(1, {{ var("questions_per_round") }}) as question_index

),

reach as (

    select
        s.source,
        s.exercise_key,
        s.topic,
        s.level,
        q.question_index,
        count(*) as sessions_started,
        count(*) filter (where s.last_question_index >= q.question_index) as sessions_reaching,
        count(*) filter (where s.quit_after_question = q.question_index) as sessions_quit_after
    from sessions s
    cross join questions q
    group by s.source, s.exercise_key, s.topic, s.level, q.question_index

),

accuracy as (

    select
        source,
        exercise_key,
        question_index,
        round(avg(correct_count), 3) as correct_rate_at_question
    from {{ ref('fct_answers') }}
    where is_analysable
    group by source, exercise_key, question_index

)

select
    r.source,
    r.exercise_key,
    r.topic,
    r.level,
    r.question_index,
    r.sessions_started,
    r.sessions_reaching,
    round(r.sessions_reaching::numeric / r.sessions_started, 3) as reach_rate,
    r.sessions_quit_after,
    a.correct_rate_at_question
from reach r
left join accuracy a using (source, exercise_key, question_index)
