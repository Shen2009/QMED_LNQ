"""
heartbeat_audio.py — Audio utilities for heart sound classification.

Ported from: https://github.com/nguyentrananhhoang13122005/heartbeat-sound-classification
Module: src/inference/audio_utils.py

Pipeline: 4 kHz resampling, bandpass filter (25–900 Hz), 5s windows (50% overlap),
64-mel spectrograms with delta & delta-delta features, global normalization.
"""
from pathlib import Path
from typing import List, Tuple
import io
import base64

import numpy as np
from scipy.signal import butter, sosfilt
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for servers
import matplotlib.pyplot as plt


def _get_librosa():
    """Lazy-import librosa so the server can start even if librosa is not yet installed.
    Will raise ImportError with a helpful message if missing."""
    try:
        import librosa as _lr
        return _lr
    except ImportError:
        raise ImportError(
            "librosa is required for heartbeat analysis. "
            "Run: pip install librosa>=0.10.1"
        )

# ── Bandpass filter params — matches training config ──────────────────────────
BP_LOW = 25.0
BP_HIGH = 900.0
BP_ORDER = 4

# ── Audio + feature params — must match training ─────────────────────────────
SR = 4000
N_FFT = 512
HOP_LENGTH = 128
N_MELS = 64
FMIN = 20.0
FMAX = 2000.0
SEGMENT_SECONDS = 5.0
HOP_SECONDS = 2.5


def bandpass_filter(
    y: np.ndarray,
    sr: int,
    low: float = BP_LOW,
    high: float = BP_HIGH,
    order: int = BP_ORDER,
) -> np.ndarray:
    """Apply Butterworth bandpass filter to remove noise outside heart sound frequency range."""
    nyq = sr / 2.0
    low_n = low / nyq
    high_n = min(high / nyq, 0.99)
    sos = butter(order, [low_n, high_n], btype="band", output="sos")
    return sosfilt(sos, y).astype(np.float32)


def load_audio(path: Path, sr: int = SR) -> np.ndarray:
    """Load and preprocess audio: resample, DC-remove, bandpass filter."""
    librosa = _get_librosa()
    y, _ = librosa.load(str(path), sr=sr, mono=True)
    if y.size == 0:
        return np.zeros(int(SEGMENT_SECONDS * sr), dtype=np.float32)
    y = y.astype(np.float32)
    y = y - np.mean(y)
    y = bandpass_filter(y, sr)
    return y


def segment_audio(
    y: np.ndarray,
    sr: int = SR,
    seg_sec: float = SEGMENT_SECONDS,
    hop_sec: float = HOP_SECONDS,
) -> List[Tuple[int, int, float, float]]:
    """Segment audio into overlapping windows. Returns list of (start, end, start_sec, end_sec)."""
    seg_len = int(seg_sec * sr)
    hop_len = int(hop_sec * sr)
    if len(y) < seg_len:
        y = np.pad(y, (0, seg_len - len(y)), mode="constant")
    starts = list(range(0, max(1, len(y) - seg_len + 1), hop_len))
    segments = []
    for s in starts:
        e = s + seg_len
        segments.append((s, e, s / sr, e / sr))
    return segments


def logmel(y: np.ndarray, sr: int = SR) -> np.ndarray:
    """Extract Log-Mel spectrogram with delta and delta-delta features.

    Returns shape [n_mels, T, 3] — 3 channels: static + delta + delta-delta.
    """
    librosa = _get_librosa()
    S = librosa.feature.melspectrogram(
        y=y, sr=sr, n_fft=N_FFT, hop_length=HOP_LENGTH,
        n_mels=N_MELS, fmin=FMIN, fmax=FMAX, power=2.0,
    )
    S_db = librosa.power_to_db(S, ref=1.0)

    delta = librosa.feature.delta(S_db, order=1)
    delta2 = librosa.feature.delta(S_db, order=2)

    feat = np.stack([S_db, delta, delta2], axis=-1)
    return feat.astype(np.float32)


def render_spectrogram_base64(y: np.ndarray, sr: int = SR) -> str:
    """Render log-mel spectrogram as a base64-encoded PNG string."""
    S = logmel(y, sr)
    S_static = S[:, :, 0] if S.ndim == 3 else S
    fig, ax = plt.subplots(figsize=(16, 5.6), constrained_layout=True)
    im = ax.imshow(S_static, origin="lower", aspect="auto", cmap="magma")
    ax.set_title("Log-Mel Spectrogram", fontsize=14, pad=10)
    ax.set_xlabel("Frames", fontsize=12)
    ax.set_ylabel("Mel bins", fontsize=12)
    fig.colorbar(im, ax=ax, fraction=0.025)
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=200, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")
