"""
heartbeat.py — Heart Sound Classification Router

Endpoint: POST /api/heartbeat/analyze
Nhận file âm thanh tim (wav/mp3/m4a/flac), chạy CNN-LSTM model,
trả về phân loại (normal/abnormal), BPM, chất lượng tín hiệu, khuyến nghị.
"""
import os
import uuid
import logging
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from pydantic import BaseModel

from app.infrastructure.logging.audit import log_heartbeat_analyse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/heartbeat", tags=["heartbeat"])

# ── Paths ─────────────────────────────────────────────────────────────────────
_BASE_DIR = Path(__file__).resolve().parents[4]  # → backend/
_MODEL_DIR = _BASE_DIR / "ml_models" / "heartbeat"
_MODEL_PATH = _MODEL_DIR / "best_cnn_lstm.keras"
_LABEL_MAP_PATH = _MODEL_DIR / "label_map.json"
_NORM_PATH = _MODEL_DIR / "feature_norm.json"
_ABNORMAL_THRESHOLD = float(os.getenv("HEARTBEAT_ABNORMAL_THRESHOLD", "0.7"))
_MAX_UPLOAD_MB = float(os.getenv("HEARTBEAT_MAX_UPLOAD_MB", "20"))

# ── Lazy predictor (avoid loading TF at import time) ─────────────────────────
_predictor = None


def _get_predictor():
    global _predictor
    if _predictor is None:
        from app.infrastructure.services.heartbeat_predictor import HeartbeatPredictor

        logger.info("Lazy-loading heartbeat predictor...")
        _predictor = HeartbeatPredictor(
            model_path=_MODEL_PATH,
            label_map_path=_LABEL_MAP_PATH,
            norm_path=_NORM_PATH,
            abnormal_threshold=_ABNORMAL_THRESHOLD,
        )
    return _predictor


# ── Response model ────────────────────────────────────────────────────────────

class HeartbeatSegment(BaseModel):
    segment_idx: int
    start_sec: float
    end_sec: float
    top_label: str
    probs: dict


class HeartbeatRecommendation(BaseModel):
    level: str
    title: str
    message: str
    icon: str


class HeartbeatResponse(BaseModel):
    primary_prediction: str
    confidence: float
    probs: dict
    bpm: int
    signal_quality: float
    recommendation: HeartbeatRecommendation
    spectrogram_b64: str
    segments: list
    highlight_segments: list
    segment_seconds: dict


# ── Allowed MIME types ────────────────────────────────────────────────────────
_ALLOWED_TYPES = {
    "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3",
    "audio/x-m4a", "audio/mp4", "audio/flac", "audio/ogg", "audio/webm",
    "application/octet-stream",
}


@router.post("/analyze", response_model=HeartbeatResponse)
async def analyze_heartbeat(request: Request, file: UploadFile = File(...)):
    """
    Phân tích âm thanh tim bằng CNN-LSTM model.

    Pipeline:
      1. Upload audio file (wav/mp3/m4a/flac)
      2. Bandpass filter (25–900 Hz) → loại nhiễu
      3. Segment 5s windows (50% overlap)
      4. Extract log-mel spectrograms + delta features
      5. CNN-LSTM classification → normal / abnormal_other
      6. OOD detection + signal quality calibration
      7. BPM estimation via autocorrelation
    """
    client_ip = request.client.host if request.client else "-"

    # Validate MIME type
    content_type = (file.content_type or "").split(";", 1)[0].lower()
    if content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. "
                   f"Accepted: wav, mp3, m4a, flac.",
        )

    # Read and validate size
    raw = await file.read()
    size_mb = len(raw) / (1024 * 1024)
    if size_mb > _MAX_UPLOAD_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File is {size_mb:.1f} MB; max allowed is {_MAX_UPLOAD_MB} MB.",
        )

    # Save to temp file
    ext = (file.filename.split(".")[-1] if file.filename else "wav").lower()
    temp_dir = Path(tempfile.gettempdir()) / "qmed_heartbeat"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"{uuid.uuid4().hex}.{ext}"

    try:
        with open(temp_path, "wb") as f:
            f.write(raw)

        logger.info(
            "Heartbeat analyse start: file=%s size=%.1fMB ip=%s",
            file.filename, size_mb, client_ip,
        )

        predictor = _get_predictor()
        result = predictor.predict_file(temp_path)

        log_heartbeat_analyse(client_ip, filename=file.filename or "unknown", success=True)
        logger.info(
            "Heartbeat analyse done: pred=%s conf=%.3f bpm=%d quality=%.2f ip=%s",
            result["record"]["primary_prediction"],
            result["record"]["confidence"],
            result["bpm"],
            result["signal_quality"],
            client_ip,
        )

        return HeartbeatResponse(
            primary_prediction=result["record"]["primary_prediction"],
            confidence=result["record"]["confidence"],
            probs=result["record"]["probs"],
            bpm=result["bpm"],
            signal_quality=result["signal_quality"],
            recommendation=HeartbeatRecommendation(**result["recommendation"]),
            spectrogram_b64=result["spectrogram_b64"],
            segments=result["segments"],
            highlight_segments=result["highlight_segments"],
            segment_seconds=result["segment_seconds"],
        )

    except Exception as e:
        log_heartbeat_analyse(client_ip, filename=file.filename or "unknown", success=False)
        logger.exception("Heartbeat analyse failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Processing failed: {e}")

    finally:
        # Cleanup temp file
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)


@router.get("/health")
def heartbeat_health():
    """Health check for heartbeat classification service."""
    model_exists = _MODEL_PATH.exists()
    return {
        "status": "ok" if model_exists else "model_missing",
        "model_path": str(_MODEL_PATH),
        "model_loaded": _predictor is not None,
    }
