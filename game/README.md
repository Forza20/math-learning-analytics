# Game

Single `index.html`, no build step, hosted on GitHub Pages (same pattern as Data Runner).

Planned (week 1):
- Ages 6–10. Topics: addition, subtraction, multiplication tables 1–10, simple division. 3 levels each.
- The player types the answer (no multiple choice), so errors can be classified later.
- DA/EN language toggle.
- Each answer is inserted into `bronze.answer_events` with the Supabase anon key and a random `session_id`.
- No name, age, login or IP address is stored. A short privacy notice is shown in the game.
