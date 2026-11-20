-- Dashboard: how hard is each topic and level?
-- One row per source, topic and level. Analysable answers only.

with answers as (

    select * from {{ ref('fct_answers') }} where is_analysable

)

select
    a.source,
    e.exercise_key,
    e.topic,
    e.level,
    e.exercise_label,
    e.description,
    e.topic_order,
    count(*) as answers,
    round(avg(a.correct_count), 3) as correct_rate,
    round(avg(a.wrong_count), 3) as wrong_rate,
    round(avg(a.skipped_count), 3) as skip_rate,
    (percentile_cont(0.5) within group (order by a.response_ms)
        filter (where a.outcome <> 'skipped'))::int as median_response_ms,
    (percentile_cont(0.9) within group (order by a.response_ms)
        filter (where a.outcome <> 'skipped'))::int as p90_response_ms
from answers a
join {{ ref('dim_exercise') }} e using (exercise_key)
group by a.source, e.exercise_key, e.topic, e.level, e.exercise_label, e.description, e.topic_order
