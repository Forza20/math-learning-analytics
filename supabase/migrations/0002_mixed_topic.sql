-- Mixed puzzles: a fifth topic with five task types in the style of Danish
-- worksheets (number sequences, unit conversion, symbol puzzles, price puzzles
-- and counting a grid of fruit). Existing rows are not changed.
--
-- For topic 'mixed', operand_a and operand_b keep a fixed meaning per task type,
-- so silver can classify errors without parsing question_text:
--
--   task_type  example                              operand_a        operand_b
--   sequence   4, 8, 12, 16, ?                      last shown term  step
--   unit       1.5 h = ? min                        factor (60)      0
--   symbol     A+A=12; A+B=13; B=?                  last sum         value of A (0 in one step)
--   price      4 banana=20; 2 apple+1 banana=11     basket total     count of the asked fruit
--   array      3x4 grid                             rows             columns
--
-- question_text is a short language-neutral ASCII form of the task. The ASCII
-- check keeps free text from the browser to printable characters only.

alter table bronze.answer_events
    drop constraint if exists answer_events_topic_check;

alter table bronze.answer_events
    add constraint answer_events_topic_check
    check (topic in ('addition', 'subtraction', 'multiplication', 'division', 'mixed'));

alter table bronze.answer_events
    add column if not exists task_type text
        check (task_type in ('sequence', 'unit', 'symbol', 'price', 'array')),
    add column if not exists question_text text
        check (question_text ~ '^[ -~]{1,80}$');

-- A mixed task always has a type and a text; the four classic topics never do.
alter table bronze.answer_events
    add constraint answer_events_mixed_has_task
    check (
        (topic = 'mixed') = (task_type is not null)
        and (task_type is null) = (question_text is null)
    );

-- The browser may set the two new columns too. Still insert only.
grant insert (task_type, question_text) on bronze.answer_events to anon;

-- Make the Data API see the new columns at once.
notify pgrst, 'reload schema';
