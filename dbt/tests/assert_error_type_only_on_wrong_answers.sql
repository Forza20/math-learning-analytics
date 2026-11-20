-- error_type must be set for every wrong answer and for nothing else.
select event_id, outcome, error_type
from {{ ref('answers') }}
where (outcome = 'wrong') <> (error_type is not null)
