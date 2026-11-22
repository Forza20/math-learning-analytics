-- Dashboard: which exact questions and words do players miss most often?
-- One row per source, topic, level and question. Analysable answers only.
-- A math question is identified by its numbers (7 × 8 and 8 × 7 are kept apart),
-- a mixed puzzle by its question_text, and a spelling question by its word.

with answers as (

    select
        f.source,
        f.topic,
        f.level,
        f.outcome,
        f.given_answer_raw,
        f.correct_count,
        f.wrong_count,
        f.skipped_count,
        case
            when f.topic = 'spelling' then f.word
            when f.topic = 'mixed' then f.question_text
            else f.operand_a || ' ' || e.symbol || ' ' || f.operand_b
        end as question
    from {{ ref('fct_answers') }} f
    join {{ ref('dim_exercise') }} e using (exercise_key)
    where f.is_analysable

),

wrong_counts as (

    select source, topic, level, question, given_answer_raw, count(*) as n
    from answers
    where outcome = 'wrong'
    group by source, topic, level, question, given_answer_raw

),

-- The most common wrong answer per question. Ties go to the smallest text.
top_wrong as (

    select distinct on (source, topic, level, question)
        source, topic, level, question,
        given_answer_raw as most_common_wrong,
        n as most_common_wrong_count
    from wrong_counts
    order by source, topic, level, question, n desc, given_answer_raw

)

select
    a.source,
    case when a.topic = 'spelling' then 'danish' else 'math' end as subject,
    a.topic,
    a.level,
    a.question,
    count(*) as answers,
    sum(a.correct_count) as correct_answers,
    sum(a.wrong_count) as wrong_answers,
    sum(a.skipped_count) as skipped_answers,
    -- Wrong or skipped: both mean the player did not get it.
    round(1 - avg(a.correct_count), 3) as miss_rate,
    t.most_common_wrong,
    t.most_common_wrong_count
from answers a
left join top_wrong t using (source, topic, level, question)
group by a.source, a.topic, a.level, a.question, t.most_common_wrong, t.most_common_wrong_count
