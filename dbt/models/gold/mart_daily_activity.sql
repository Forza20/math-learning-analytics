-- Dashboard: activity per day. One row per day and source, including days with no play.

with sessions as (

    select * from {{ ref('fct_sessions') }} where is_analysable

),

sources as (

    select unnest(array['real', 'simulated']) as source

),

daily as (

    select
        date_key,
        source,
        count(*) as sessions,
        sum(answers) as answers,
        sum(correct_answers) as correct_answers,
        count(*) filter (where is_completed) as completed_sessions,
        round(avg(duration_seconds)) as avg_session_seconds
    from sessions
    group by date_key, source

)

select
    d.date_key,
    d.date_day,
    d.weekday_name,
    d.is_weekend,
    s.source,
    coalesce(x.sessions, 0) as sessions,
    coalesce(x.answers, 0) as answers,
    round(x.correct_answers::numeric / nullif(x.answers, 0), 3) as correct_rate,
    round(x.completed_sessions::numeric / nullif(x.sessions, 0), 3) as completion_rate,
    x.avg_session_seconds
from {{ ref('dim_date') }} d
cross join sources s
left join daily x on x.date_key = d.date_key and x.source = s.source
