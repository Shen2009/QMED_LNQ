from __future__ import annotations

import math
import statistics
from datetime import datetime, timezone
from typing import Any


class RppgError(ValueError):
    pass


def analyze_rppg_payload(payload: dict[str, Any]) -> dict[str, Any]:
    fps = _read_fps(payload.get("fps", 30))
    signal = _read_signal(payload)
    duration = len(signal) / fps

    if duration < 6:
        raise RppgError("rPPG needs at least 6 seconds of signal")

    cleaned = _preprocess_signal(signal)
    spectrum = _heart_rate_spectrum(cleaned, fps)
    if not spectrum:
        raise RppgError("Unable to extract heart-rate spectrum")

    peak = max(spectrum, key=lambda item: item["power"])
    heart_rate = round(peak["bpm"])
    quality = _estimate_quality(spectrum, peak["power"])
    status = _status_from_hr(heart_rate, quality)

    return {
        "type": "Face rPPG",
        "status": status,
        "measuredAt": datetime.now(timezone.utc).isoformat(),
        "duration": round(duration),
        "primaryLabel": "Heart Rate",
        "primaryValue": heart_rate,
        "primaryUnit": "BPM",
        "note": "rPPG estimate from RGB/green-channel signal. Not for medical diagnosis.",
        "metrics": [
            {"label": "Heart Rate", "value": heart_rate, "unit": "BPM", "icon": "favorite"},
            {"label": "Signal Quality", "value": quality, "unit": "%", "icon": "verified"},
            {"label": "Samples", "value": len(signal), "unit": "", "icon": "timeline"},
        ],
        "debug": {
            "fps": fps,
            "durationSeconds": round(duration, 2),
            "dominantFrequencyHz": round(peak["hz"], 4),
            "method": "green-channel FFT rPPG",
        },
    }


def _read_fps(raw_fps: Any) -> float:
    try:
        fps = float(raw_fps)
    except (TypeError, ValueError) as error:
        raise RppgError("fps must be a number") from error

    if fps < 10 or fps > 120:
        raise RppgError("fps must be between 10 and 120")

    return fps


def _read_signal(payload: dict[str, Any]) -> list[float]:
    if isinstance(payload.get("greenSignal"), list):
        return _clean_numeric_series(payload["greenSignal"])

    rgb_samples = payload.get("rgbSamples")
    if not isinstance(rgb_samples, list):
        raise RppgError("Provide greenSignal or rgbSamples")

    signal: list[float] = []
    for sample in rgb_samples:
        if isinstance(sample, dict):
            red = _number(sample.get("r"))
            green = _number(sample.get("g"))
            blue = _number(sample.get("b"))
        elif isinstance(sample, list | tuple) and len(sample) >= 3:
            red = _number(sample[0])
            green = _number(sample[1])
            blue = _number(sample[2])
        else:
            continue

        # A light chrominance-style projection. Green carries the strongest
        # pulse signal, while red/blue help cancel shared illumination changes.
        signal.append(green - 0.5 * red - 0.5 * blue)

    return _clean_numeric_series(signal)


def _clean_numeric_series(values: list[Any]) -> list[float]:
    signal: list[float] = []
    for value in values:
        try:
            number = float(value)
        except (TypeError, ValueError):
            continue
        if math.isfinite(number):
            signal.append(number)

    if len(signal) < 60:
        raise RppgError("Not enough valid signal samples")

    return signal


def _number(value: Any) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as error:
        raise RppgError("RGB sample values must be numeric") from error
    if not math.isfinite(number):
        raise RppgError("RGB sample values must be finite")
    return number


def _preprocess_signal(signal: list[float]) -> list[float]:
    detrended = _remove_linear_trend(signal)
    smoothed = _moving_average(detrended, window=5)
    mean = statistics.fmean(smoothed)
    stdev = statistics.pstdev(smoothed) or 1.0
    return [(value - mean) / stdev for value in smoothed]


def _remove_linear_trend(signal: list[float]) -> list[float]:
    n = len(signal)
    x_mean = (n - 1) / 2
    y_mean = statistics.fmean(signal)
    denominator = sum((index - x_mean) ** 2 for index in range(n)) or 1.0
    slope = sum((index - x_mean) * (value - y_mean) for index, value in enumerate(signal))
    slope /= denominator
    intercept = y_mean - slope * x_mean
    return [value - (slope * index + intercept) for index, value in enumerate(signal)]


def _moving_average(signal: list[float], window: int) -> list[float]:
    if window <= 1:
        return signal

    half = window // 2
    smoothed: list[float] = []
    for index in range(len(signal)):
        start = max(0, index - half)
        end = min(len(signal), index + half + 1)
        smoothed.append(statistics.fmean(signal[start:end]))
    return smoothed


def _heart_rate_spectrum(signal: list[float], fps: float) -> list[dict[str, float]]:
    n = len(signal)
    min_hz = 0.7
    max_hz = 3.0
    min_bin = max(1, math.ceil(min_hz * n / fps))
    max_bin = min(n // 2, math.floor(max_hz * n / fps))
    if min_bin > max_bin:
        return []

    windowed = _hamming_window(signal)
    spectrum: list[dict[str, float]] = []
    for bin_index in range(min_bin, max_bin + 1):
        real = 0.0
        imag = 0.0
        for sample_index, value in enumerate(windowed):
            angle = 2 * math.pi * bin_index * sample_index / n
            real += value * math.cos(angle)
            imag -= value * math.sin(angle)

        hz = bin_index * fps / n
        spectrum.append(
            {
                "hz": hz,
                "bpm": hz * 60,
                "power": real * real + imag * imag,
            }
        )

    return spectrum


def _hamming_window(signal: list[float]) -> list[float]:
    n = len(signal)
    if n <= 1:
        return signal
    return [
        value * (0.54 - 0.46 * math.cos(2 * math.pi * index / (n - 1)))
        for index, value in enumerate(signal)
    ]


def _estimate_quality(spectrum: list[dict[str, float]], peak_power: float) -> int:
    total_power = sum(item["power"] for item in spectrum) or 1.0
    ratio = peak_power / total_power
    quality = round(max(0.0, min(1.0, ratio * 4.2)) * 100)
    return max(1, min(99, quality))


def _status_from_hr(heart_rate: int, quality: int) -> str:
    if quality < 35:
        return "Tin hieu yeu"
    if heart_rate < 55 or heart_rate > 105:
        return "Can theo doi"
    return "Binh thuong"
