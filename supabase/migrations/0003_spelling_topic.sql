-- Spelling (the game's "Dansk" subject): a sixth topic. Each question shows three
-- spellings of a Danish word, one right and two typical misspellings, and the
-- player picks one. Existing rows are not changed.
--
-- For topic 'spelling':
--   word            the correct spelling, lower-case Danish letters
--   given_answer    the spelling the player picked (NULL = skipped)
--   operand_a       number of letters in the word
--   operand_b       0
--   correct_answer  0 (the answer is text, compare given_answer with word)
--   task_type, question_text  NULL
--
-- The letter checks keep free text from the browser to Danish letters only.
-- 'é' is allowed in given_answer because one misspelling uses it (sammén).

alter table bronze.answer_events
    drop constraint if exists answer_events_topic_check;

alter table bronze.answer_events
    add constraint answer_events_topic_check
    check (topic in ('addition', 'subtraction', 'multiplication', 'division', 'mixed', 'spelling'));

alter table bronze.answer_events
    add column if not exists word text
        check (word ~ '^[a-zæøå]{1,20}$');

-- A spelling question always has a word; the math topics never do.
alter table bronze.answer_events
    add constraint answer_events_spelling_has_word
    check ((topic = 'spelling') = (word is not null));

-- Math answers stay at most 10 characters. A picked spelling may be up to 20 letters.
alter table bronze.answer_events
    drop constraint if exists answer_events_given_answer_check;

alter table bronze.answer_events
    add constraint answer_events_given_answer_check
    check (
        given_answer is null
        or (topic <> 'spelling' and char_length(given_answer) <= 10)
        or (topic = 'spelling' and given_answer ~ '^[a-zæøåé]{1,20}$')
    );

-- The browser may set the new column too. Still insert only.
grant insert (word) on bronze.answer_events to anon;

-- Make the Data API see the new column at once.
notify pgrst, 'reload schema';
