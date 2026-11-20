-- Dashboard: which mistakes do players make, and where?
-- One row per source, topic, level and error type. Analysable wrong answers only.

with wrong as (

    select * from {{ ref('fct_answers') }} where is_analysable and outcome = 'wrong'

)

select
    w.source,
    w.exercise_key,
    w.topic,
    w.level,
    t.error_type,
    t.label as error_label,
    t.rule_order,
    t.is_systematic,
    count(*) as wrong_answers,
    round(
        count(*)::numeric / sum(count(*)) over (partition by w.source, w.exercise_key),
        3
    ) as share_of_wrong
from wrong w
join {{ ref('dim_error_type') }} t using (error_type)
group by w.source, w.exercise_key, w.topic, w.level, t.error_type, t.label, t.rule_order, t.is_systematic
