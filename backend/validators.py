from __future__ import annotations

from datetime import datetime
from typing import Any
import uuid


REQUIRED_MEASUREMENT_FIELDS = (
    "type",
    "status",
    "measuredAt",
    "primaryLabel",
    "primaryValue",
)


class ValidationError(ValueError):
    pass


def normalize_measurement(body: dict[str, Any]) -> dict[str, Any]:
    for field in REQUIRED_MEASUREMENT_FIELDS:
        if body.get(field) in (None, ""):
            raise ValidationError(f"Missing field: {field}")

    metrics = body.get("metrics", [])
    if not isinstance(metrics, list):
        raise ValidationError("metrics must be an array")

    duration = body.get("duration")
    if duration not in (None, ""):
        try:
            duration = int(duration)
        except (TypeError, ValueError) as error:
            raise ValidationError("duration must be a number") from error

    return {
        "id": str(body.get("id") or f"measure-{uuid.uuid4().hex[:12]}"),
        "type": str(body["type"]),
        "status": str(body["status"]),
        "measuredAt": _normalize_datetime(str(body["measuredAt"])),
        "duration": duration,
        "primaryLabel": str(body["primaryLabel"]),
        "primaryValue": body["primaryValue"],
        "primaryUnit": str(body.get("primaryUnit") or ""),
        "note": str(body.get("note") or ""),
        "metrics": metrics,
    }


def normalize_positive_int(value: str | None, default: int, maximum: int) -> int:
    if not value:
        return default

    try:
        parsed = int(value)
    except ValueError:
        return default

    return max(1, min(parsed, maximum))


def _normalize_datetime(value: str) -> str:
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return value
    except ValueError as error:
        raise ValidationError("measuredAt must be an ISO datetime") from error
