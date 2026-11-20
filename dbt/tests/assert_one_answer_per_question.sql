-- After deduplication, each question in a session appears once.
select session_id, question_index, count(*) as copies
from {{ ref('answers') }}
group by session_id, question_index
having count(*) > 1
