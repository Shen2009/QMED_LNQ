from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
from typing import Any


Metric = dict[str, str | int | float]
Result = dict[str, Any]


def _stable_number(seed: str, minimum: int, maximum: int) -> int:
    digest = sha256(seed.encode("utf-8")).hexdigest()
    value = int(digest[:8], 16)
    return minimum + value % (maximum - minimum + 1)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def analyze_measurement(measurement_type: str, payload: dict[str, Any] | None = None) -> Result:
    """Return an AI-like result for the frontend.

    The real trained model is not present in this workspace anymore. This function keeps
    the same output contract that the mobile frontend needs, so the app can be developed
    and tested now. Later, replace the deterministic demo values below with real model
    inference, for example: load frames -> preprocess -> model.predict() -> map result.
    """

    payload = payload or {}
    normalized_type = measurement_type.strip().lower().replace("-", "_").replace(" ", "_")
    seed = f"{normalized_type}:{payload.get('sessionId', '')}:{payload.get('startedAt', '')}"

    if normalized_type in {"face_rppg", "rppg", "face"}:
        heart_rate = _stable_number(seed, 68, 86)
        hrv = _stable_number(seed + ":hrv", 36, 62)
        quality = _stable_number(seed + ":quality", 84, 98)
        return {
            "type": "Face rPPG",
            "status": "Binh thuong",
            "measuredAt": _now_iso(),
            "duration": int(payload.get("duration", 15)),
            "primaryLabel": "Heart Rate",
            "primaryValue": heart_rate,
            "primaryUnit": "BPM",
            "note": "Ket qua demo tu backend. Can cam model rPPG that de dung cho y te.",
            "metrics": [
                {"label": "Heart Rate", "value": heart_rate, "unit": "BPM", "icon": "favorite"},
                {"label": "HRV", "value": hrv, "unit": "ms", "icon": "monitor-heart"},
                {"label": "Signal Quality", "value": quality, "unit": "%", "icon": "verified"},
            ],
        }

    if normalized_type == "stress":
        stress = _stable_number(seed, 25, 58)
        hrv = _stable_number(seed + ":hrv", 35, 68)
        status = "Can theo doi" if stress >= 50 else "Binh thuong"
        return {
            "type": "Stress",
            "status": status,
            "measuredAt": _now_iso(),
            "duration": int(payload.get("duration", 10)),
            "primaryLabel": "Stress Level",
            "primaryValue": stress,
            "primaryUnit": "%",
            "note": "Uoc tinh muc do cang thang dua tren tin hieu sinh hoc demo.",
            "metrics": [
                {"label": "Stress", "value": stress, "unit": "%", "icon": "psychology"},
                {"label": "HRV", "value": hrv, "unit": "ms", "icon": "monitor-heart"},
                {"label": "Signal Quality", "value": _stable_number(seed + ":quality", 85, 98), "unit": "%", "icon": "verified"},
            ],
        }

    if normalized_type in {"blood_pressure", "bp"}:
        systolic = _stable_number(seed, 108, 124)
        diastolic = _stable_number(seed + ":dia", 68, 82)
        pulse = _stable_number(seed + ":pulse", 68, 88)
        status = "Can theo doi" if systolic >= 120 or diastolic >= 80 else "Binh thuong"
        return {
            "type": "Blood Pressure",
            "status": status,
            "measuredAt": _now_iso(),
            "duration": int(payload.get("duration", 12)),
            "primaryLabel": "Blood Pressure",
            "primaryValue": f"{systolic}/{diastolic}",
            "primaryUnit": "mmHg",
            "note": "Chi so huyet ap demo, khong thay the thiet bi y te chuyen dung.",
            "metrics": [
                {"label": "Systolic", "value": systolic, "unit": "mmHg", "icon": "arrow-upward"},
                {"label": "Diastolic", "value": diastolic, "unit": "mmHg", "icon": "arrow-downward"},
                {"label": "Pulse", "value": pulse, "unit": "BPM", "icon": "favorite-border"},
            ],
        }

    if normalized_type in {"heartbeat", "heart_rate"}:
        heart_rate = _stable_number(seed, 66, 88)
        confidence = _stable_number(seed + ":confidence", 88, 99)
        return {
            "type": "Heartbeat",
            "status": "Binh thuong",
            "measuredAt": _now_iso(),
            "duration": int(payload.get("duration", 8)),
            "primaryLabel": "Rhythm",
            "primaryValue": "Normal",
            "primaryUnit": "",
            "note": "Kiem tra nhip tim demo dua tren luong du lieu frontend gui len.",
            "metrics": [
                {"label": "Heart Rate", "value": heart_rate, "unit": "BPM", "icon": "favorite"},
                {"label": "Confidence", "value": confidence, "unit": "%", "icon": "verified-user"},
                {"label": "Signal Quality", "value": _stable_number(seed + ":quality", 86, 99), "unit": "%", "icon": "graphic-eq"},
            ],
        }

    raise ValueError(f"Unsupported measurement type: {measurement_type}")
