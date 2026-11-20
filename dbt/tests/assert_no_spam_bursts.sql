{{ config(severity='warn') }}

-- The browser can insert freely, so watch for abuse: hours with an unusual
-- number of real answers, or real sessions with machine-speed answers.
-- A warning, not an error: a busy classroom is possible, and the nightly
-- pipeline should keep running while someone looks into it.

select
    'busy_hour' as check_name,
    date_trunc('hour', received_at)::text as detail,
    count(*) as value
from {{ ref('answers') }}
where source = 'real'
group by date_trunc('hour', received_at)
having count(*) > {{ var('spam_events_per_hour') }}

union all

select
    'too_fast_session',
    session_id::text,
    count(*)
from {{ ref('answers') }}
where source = 'real' and is_too_fast
group by session_id
having count(*) >= 3
