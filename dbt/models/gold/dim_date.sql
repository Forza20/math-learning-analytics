-- One row per local (Copenhagen) calendar day, from the first answer to today.

with bounds as (

    select
        coalesce(min(answer_date_local), current_date) as first_date,
        greatest(coalesce(max(answer_date_local), current_date), current_date) as last_date
    from {{ ref('answers') }}

),

days as (

    select generate_series(first_date, last_date, interval '1 day')::date as date_day
    from bounds

)

select
    to_char(date_day, 'YYYYMMDD')::int as date_key,
    date_day,
    extract(isodow from date_day)::smallint as iso_weekday,
    to_char(date_day, 'FMDay') as weekday_name,
    extract(isodow from date_day) >= 6 as is_weekend,
    extract(isoyear from date_day)::smallint as iso_year,
    extract(week from date_day)::smallint as iso_week,
    date_trunc('week', date_day)::date as week_start,
    date_trunc('month', date_day)::date as month_start
from days
