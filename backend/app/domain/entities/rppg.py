from typing import List, Optional
from pydantic import BaseModel


class RPPGAnalysisResult(BaseModel):
    # ── Core output ──────────────────────────────────────────────────────────
    hr_fft: Optional[float] = None        # Nhịp tim (BPM) — FFT method
    hr_peak: Optional[float] = None       # Nhịp tim (BPM) — Peak detection (cross-check)

    # ── Derived vitals (computed in service from the rPPG signal) ────────────
    stress_level: Optional[float] = None  # 0–100 (nghịch đảo HRV chuẩn hoá)
    hrv_ms: Optional[float] = None        # HRV - RMSSD (ms) — dùng nội bộ để tính stress

    # ── Signal metadata (dùng cho chart frontend) ────────────────────────────
    duration: Optional[float] = None
    fps: Optional[float] = None
    n_frames: Optional[int] = None
    face_detected: Optional[bool] = None
    signal: Optional[List[float]] = None
    time_axis: Optional[List[float]] = None
    freq_axis: Optional[List[float]] = None
    power: Optional[List[float]] = None
