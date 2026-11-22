-- The marts must add up to the facts they summarise. Any row returned is a mismatch.

with fact_answers as (
    select source, count(*) as n
    from {{ ref('fct_answers') }}
    where is_analysable
    group by source
),

difficulty as (
    select source, sum(answers) as n from {{ ref('mart_difficulty') }} group by source
),

fact_wrong as (
    select source, count(*) as n
    from {{ ref('fct_answers') }}
    where is_analysable and outcome = 'wrong'
    group by source
),

errors as (
    select source, sum(wrong_answers) as n from {{ ref('mart_errors') }} group by source
),

fact_sessions as (
    select source, count(*) as n, sum(answers) as answers
    from {{ ref('fct_sessions') }}
    where is_analysable
    group by source
),

daily as (
    select source, sum(sessions) as n, sum(answers) as answers
    from {{ ref('mart_daily_activity') }}
    group by source
)

select 'mart_difficulty answers' as check_name, f.source, f.n as expected, m.n as actual
from fact_answers f left join difficulty m using (source)
where m.n is distinct from f.n

union all

select 'mart_errors wrong answers', f.source, f.n, m.n
from fact_wrong f left join errors m using (source)
where m.n is distinct from f.n

union all

select 'mart_daily_activity sessions', f.source, f.n, m.n
from fact_sessions f left join daily m using (source)
where m.n is distinct from f.n

union all

select 'mart_daily_activity answers', f.source, f.answers, m.answers
from fact_sessions f left join daily m using (source)
where m.answers is distinct from f.answers

union all

select 'mart_task_types mixed answers', f.source, f.n, m.n
from (
    select source, count(*) as n
    from {{ ref('fct_answers') }}
    where is_analysable and topic = 'mixed'
    group by source
) f
left join (
    select source, sum(answers) as n from {{ ref('mart_task_types') }} group by source
) m using (source)
where m.n is distinct from f.n
