-- Dashboard: which times tables are hardest?
-- Level 1 multiplication and division only, where each question belongs to one table.

select
    source,
    topic,
    times_table,
    count(*) as answers,
    round(avg(correct_count), 3) as correct_rate,
    (percentile_cont(0.5) within group (order by response_ms)
        filter (where outcome <> 'skipped'))::int as median_response_ms
from {{ ref('fct_answers') }}
where is_analysable and times_table is not null
group by source, topic, times_table
