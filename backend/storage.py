from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any


DB_PATH = Path(__file__).resolve().parent / "qmed.sqlite3"


def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS measurements (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                status TEXT NOT NULL,
                measured_at TEXT NOT NULL,
                duration INTEGER,
                primary_label TEXT NOT NULL,
                primary_value TEXT NOT NULL,
                primary_unit TEXT,
                note TEXT,
                metrics_json TEXT NOT NULL
            )
            """
        )


def list_measurements(
    measurement_type: str | None = None,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    query = "SELECT * FROM measurements"
    params: list[Any] = []

    if measurement_type:
        query += " WHERE type = ?"
        params.append(measurement_type)

    query += " ORDER BY measured_at DESC"

    if limit:
        query += " LIMIT ?"
        params.append(limit)

    with _connect() as connection:
        rows = connection.execute(query, params).fetchall()
    return [_row_to_measurement(row) for row in rows]


def get_measurement(record_id: str) -> dict[str, Any] | None:
    with _connect() as connection:
        row = connection.execute(
            "SELECT * FROM measurements WHERE id = ?",
            (record_id,),
        ).fetchone()
    return _row_to_measurement(row) if row else None


def save_measurement(record: dict[str, Any]) -> dict[str, Any]:
    with _connect() as connection:
        connection.execute(
            """
            INSERT OR REPLACE INTO measurements (
                id, type, status, measured_at, duration, primary_label, primary_value,
                primary_unit, note, metrics_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                record["id"],
                record["type"],
                record["status"],
                record["measuredAt"],
                record.get("duration"),
                record["primaryLabel"],
                str(record["primaryValue"]),
                record.get("primaryUnit"),
                record.get("note"),
                json.dumps(record.get("metrics", [])),
            ),
        )
    return record


def delete_measurement(record_id: str) -> bool:
    with _connect() as connection:
        cursor = connection.execute("DELETE FROM measurements WHERE id = ?", (record_id,))
    return cursor.rowcount > 0


def clear_measurements() -> None:
    with _connect() as connection:
        connection.execute("DELETE FROM measurements")


def measurement_summary() -> dict[str, Any]:
    with _connect() as connection:
        total = connection.execute("SELECT COUNT(*) AS total FROM measurements").fetchone()[
            "total"
        ]
        by_type_rows = connection.execute(
            "SELECT type, COUNT(*) AS count FROM measurements GROUP BY type ORDER BY count DESC"
        ).fetchall()
        latest = connection.execute(
            "SELECT * FROM measurements ORDER BY measured_at DESC LIMIT 1"
        ).fetchone()

    return {
        "total": total,
        "byType": {row["type"]: row["count"] for row in by_type_rows},
        "latest": _row_to_measurement(latest) if latest else None,
    }


def _row_to_measurement(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "type": row["type"],
        "status": row["status"],
        "measuredAt": row["measured_at"],
        "duration": row["duration"],
        "primaryLabel": row["primary_label"],
        "primaryValue": row["primary_value"],
        "primaryUnit": row["primary_unit"],
        "note": row["note"],
        "metrics": json.loads(row["metrics_json"]),
    }
