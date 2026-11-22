-- Dashboard: which kinds of mixed puzzle are hard?
-- One row per source, task type and level. Analysable answers to topic 'mixed' only.

select
    source,
    task_type,
    level,
    count(*) as answers,
    round(avg(correct_count), 3) as correct_rate,
    round(avg(wrong_count), 3) as wrong_rate,
    round(avg(skipped_count), 3) as skip_rate,
    (percentile_cont(0.5) within group (order by response_ms)
        filter (where outcome <> 'skipped'))::int as median_response_ms,
    case task_type
        when 'sequence' then 1
        when 'unit' then 2
        when 'symbol' then 3
        when 'price' then 4
        when 'array' then 5
    end as task_order
from {{ ref('fct_answers') }}
where is_analysable and topic = 'mixed'
group by source, task_type, level
