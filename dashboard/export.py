"""Export the gold marts to dashboard/data.js for the static dashboard.

Usage:
    python dashboard/export.py                  # reads DBT_* from .env or the environment

The page loads data.js with a <script> tag (window.DASHBOARD_DATA = {...}), so it
works both on GitHub Pages and when index.html is opened straight from disk.
No database credentials ever reach the browser.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent

QUERIES = {
    "difficulty": """
        select source, exercise_key, topic, level, exercise_label, description, topic_order,
               answers, correct_rate, wrong_rate, skip_rate, median_response_ms, p90_response_ms
        from gold.mart_difficulty order by source, topic_order, level""",
    "errors": """
        select source, topic, level, error_type, error_label, rule_order, is_systematic,
               wrong_answers, share_of_wrong
        from gold.mart_errors order by source, topic, level, rule_order""",
    "error_types": """
        select error_type, rule_order, label, description, example, is_systematic
        from gold.dim_error_type order by rule_order""",
    "times_tables": """
        select source, topic, times_table, answers, correct_rate, median_response_ms
        from gold.mart_times_tables order by source, topic, times_table""",
    "dropoff": """
        select source, topic, level, question_index, sessions_started, sessions_reaching,
               sessions_quit_after, correct_rate_at_question
        from gold.mart_dropoff order by source, topic, level, question_index""",
    "daily": """
        select date_day, weekday_name, is_weekend, source, sessions, answers,
               correct_rate, completion_rate, avg_session_seconds
        from gold.mart_daily_activity order by date_day, source""",
    "kpis": """
        select s.source,
               count(*) as sessions,
               sum(s.answers) as answers,
               round(sum(s.correct_answers)::numeric / nullif(sum(s.answers), 0), 3) as correct_rate,
               round(avg(s.is_completed::int), 3) as completion_rate,
               count(distinct s.date_key) as active_days,
               min(s.started_at) as first_answer,
               max(s.ended_at) as last_answer
        from gold.fct_sessions s
        where s.is_analysable
        group by s.source""",
}


def to_json(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    raise TypeError(f"cannot serialise {type(value).__name__}")


def load_env() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(HERE.parent / ".env")


def main() -> None:
    import psycopg
    from psycopg.rows import dict_row

    load_env()
    missing = [v for v in ("DBT_HOST", "DBT_USER", "DBT_PASSWORD") if not os.environ.get(v)]
    if missing:
        sys.exit(f"Missing environment variables: {', '.join(missing)}. Fill in .env (see .env.example).")

    data: dict = {"generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    with psycopg.connect(
        host=os.environ["DBT_HOST"],
        port=int(os.environ.get("DBT_PORT", "5432")),
        user=os.environ["DBT_USER"],
        password=os.environ["DBT_PASSWORD"],
        dbname=os.environ.get("DBT_DBNAME", "postgres"),
        sslmode="require",
        row_factory=dict_row,
    ) as conn:
        for name, sql in QUERIES.items():
            data[name] = conn.execute(sql).fetchall()

    out = HERE / "data.js"
    body = json.dumps(data, default=to_json, ensure_ascii=False, separators=(",", ":"))
    out.write_text(f"window.DASHBOARD_DATA = {body};\n", encoding="utf-8")
    sizes = ", ".join(f"{k} {len(v)}" for k, v in data.items() if isinstance(v, list))
    print(f"Wrote {out.relative_to(HERE.parent)} ({out.stat().st_size // 1024} KB): {sizes}")


if __name__ == "__main__":
    main()
