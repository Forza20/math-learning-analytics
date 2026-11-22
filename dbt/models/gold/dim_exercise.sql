-- One row per topic and level, with labels for the dashboard.
-- Descriptions follow the current game rules (rules_version 2).

select
    exercise_key,
    topic,
    level,
    topic_label,
    symbol,
    level_label,
    description,
    topic_label || ' · ' || level_label as exercise_label,
    case topic
        when 'addition' then 1
        when 'subtraction' then 2
        when 'multiplication' then 3
        when 'division' then 4
        when 'mixed' then 5
    end as topic_order
from {{ ref('exercise_levels') }}
