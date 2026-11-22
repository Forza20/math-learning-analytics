-- mart_hardest_questions has one row per source, topic, level and question.
select source, topic, level, question, count(*) as n
from {{ ref('mart_hardest_questions') }}
group by source, topic, level, question
having count(*) > 1
