import math
import os
import sys
import traceback
from typing import Optional

import cv2
import numpy as np
import torch
from scipy.signal import butter, filtfilt

from app.adapters.services.rppg_service import IRPPGService
from app.domain.entities.rppg import RPPGAnalysisResult
from app.infrastructure.services.stress_inference_from_bvp import infer_stress_from_bvp

import logging

logger = logging.getLogger(__name__)

# L1/L2: consolidated single sys.path block (removed duplicate imports + duplicate path manipulation)
_APP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
_ROOT = os.path.join(_APP_DIR, "rPPG")
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from dataset.data_loader.BaseLoader import BaseLoader
from evaluation.post_process import _calculate_fft_hr, _calculate_peak_hr
from neural_methods.model.EfficientPhys import EfficientPhys
from neural_methods.model.TS_CAN import TSCAN
from neural_methods.model.RhythmFormer import RhythmFormer
from neural_methods.model.FactorizePhys.FactorizePhys import FactorizePhys

_MODEL_INFO = {
    "FactorizePhys (UBFC-rPPG)": {
        "class": FactorizePhys,
        "init_kwargs": {
            "frames": 160,
            "md_config": {
                "MD_FSAM": False,
                "MD_TYPE": "NMF",
                "MD_R": 1,
                "MD_S": 1,
                "MD_STEPS": 4,
                "MD_RESIDUAL": True,
                "MD_INFERENCE": True
            }
        },
        "pth": os.path.join(_ROOT, "final_model_release", "UBFC-rPPG_FactorizePhys_FSAM_Res.pth"),
        "frame_depth": 160,
        "img_size": 72,
        "data_type": ["Raw"],
        "data_format": "NCDHW",
        "internal_diff": False,
    },
    "RhythmFormer (UBFC-rPPG)": {
        "class": RhythmFormer,
        "init_kwargs": {},
        "pth": os.path.join(_ROOT, "final_model_release", "UBFC-rPPG_RhythmFormer.pth"),
        "frame_depth": 160,
        "img_size": 128,
        "data_type": ["Standardized"],
        "internal_diff": False,
        "unsqueeze_dim": 0,
    },
    "TSCAN (UBFC-rPPG)": {
        "class": TSCAN,
        "init_kwargs": {"frame_depth": 20, "img_size": 72},
        "pth": os.path.join(_ROOT, "final_model_release", "UBFC-rPPG_TSCAN.pth"),
        "frame_depth": 20,
        "img_size": 72,
        "data_type": ["DiffNormalized", "Standardized"],
        "internal_diff": False,
    },
    "EfficientPhys (UBFC-rPPG)": {
        "class": EfficientPhys,
        "init_kwargs": {"frame_depth": 10, "img_size": 72, "in_channels": 3, "channel": "raw"},
        "pth": os.path.join(_ROOT, "final_model_release", "UBFC-rPPG_EfficientPhys.pth"),
        "frame_depth": 10,
        "img_size": 72,
        "data_type": ["Standardized"],
        "internal_diff": True,
    },
}

_FACE_CASCADE_PATH = os.path.join(_ROOT, "dataset", "haarcascade_frontalface_default.xml")


def _bandpass(sig, fs, lo=0.6, hi=4.0, order=3):
    nyq = 0.5 * fs
    b, a = butter(order, [lo / nyq, hi / nyq], btype="band")
    return filtfilt(b, a, sig)


def _preprocess_frames(frames, data_type, data_format="NDCHW"):
    parts = []
    for dt in data_type:
        if dt == "DiffNormalized":
            parts.append(BaseLoader.diff_normalize_data(frames))
        elif dt == "Standardized":
            parts.append(BaseLoader.standardized_data(frames))
        elif dt == "Raw":
            parts.append(frames.copy())
    stacked = np.concatenate(parts, axis=-1)

    if data_format == "NDCHW":
        return np.transpose(stacked, (0, 3, 1, 2)).astype(np.float32)
    elif data_format == "NCDHW":
        return np.transpose(stacked, (3, 0, 1, 2)).astype(np.float32)
    return np.transpose(stacked, (0, 3, 1, 2)).astype(np.float32)


def _sanitize_float(v):
    if isinstance(v, float) and not math.isfinite(v):
        return None
    return v


def _sanitize_list(lst):
    return [0.0 if (isinstance(x, float) and not math.isfinite(x)) else x for x in lst]


# ─── HRV (RMSSD) từ tín hiệu rPPG ────────────────────────────────────────────────
def _compute_hrv_rmssd(signal: np.ndarray, fps: float) -> Optional[float]:
    """
    Ước lượng RMSSD (ms) từ tín hiệu rPPG.
    Bước 1: phát hiện peak trong tín hiệu đã bandpass.
    Bước 2: tính R-R intervals (ms).
    Bước 3: RMSSD = sqrt(mean(diff(RR)^2)).
    """
    try:
        from scipy.signal import find_peaks
        # min_distance ~ 0.4s (tương đương 150 BPM max)
        min_dist = max(1, int(fps * 0.4))
        peaks, _ = find_peaks(signal, distance=min_dist, height=np.percentile(signal, 60))
        if len(peaks) < 4:
            return None
        rr_ms = np.diff(peaks) / fps * 1000.0          # đơn vị ms
        rr_ms = rr_ms[(rr_ms > 300) & (rr_ms < 2000)]  # loại nhiễu sinh lý
        if len(rr_ms) < 3:
            return None
        rmssd = float(np.sqrt(np.mean(np.diff(rr_ms) ** 2)))
        return round(rmssd, 1) if math.isfinite(rmssd) else None
    except Exception:
        return None


def _compute_stress(hrv_ms: Optional[float]) -> Optional[float]:
    """
    Chuyển HRV (RMSSD ms) → stress_level 0–100.
    Công thức đơn giản: HRV 10ms → stress 90, HRV 80ms → stress 10.
    """
    if hrv_ms is None:
        return None
    hrv_clamped = max(5.0, min(100.0, hrv_ms))
    # Linear inverse mapping:  stress = 100 - (hrv - 5) / 95 * 90
    stress = 100.0 - (hrv_clamped - 5.0) / 95.0 * 90.0
    return round(max(0, min(100, stress)), 1)

_model_cache = {}


def _load_model(model_key, device_str):
    key = (model_key, device_str)
    if key not in _model_cache:
        cfg = _MODEL_INFO[model_key]
        kwargs = dict(cfg["init_kwargs"])
        net = cfg["class"](**kwargs)
        if device_str.startswith("cuda"):
            gpu_id = int(device_str.split(":")[-1]) if ":" in device_str else 0
            net = torch.nn.DataParallel(net, device_ids=[gpu_id])
        else:
            net = torch.nn.DataParallel(net)

        state_dict = torch.load(cfg["pth"], map_location=torch.device(device_str))
        net.load_state_dict(state_dict, strict=False)
        net.to(device_str)
        net.eval()
        _model_cache[key] = (net, cfg)
    return _model_cache[key]


def _read_video_frames(video_path):
    cap = cv2.VideoCapture(video_path)
    meta_fps = cap.get(cv2.CAP_PROP_FPS)
    frames = []
    timestamps_ms = []
    while True:
        ts = cap.get(cv2.CAP_PROP_POS_MSEC)
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        timestamps_ms.append(ts)
    cap.release()

    if len(timestamps_ms) >= 2 and (meta_fps <= 0 or meta_fps > 120):
        duration_s = (timestamps_ms[-1] - timestamps_ms[0]) / 1000.0
        fps = len(frames) / duration_s if duration_s > 0 else 30.0
    else:
        fps = meta_fps if meta_fps and meta_fps > 0 else 30.0

    fps = float(np.clip(fps, 1.0, 120.0))
    return np.array(frames, dtype=np.uint8), fps


def _detect_and_crop_faces(frames, img_size, detection_freq=30):
    cascade = cv2.CascadeClassifier(_FACE_CASCADE_PATH)

    def _detect(frame_rgb):
        gray = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2GRAY)
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
        if len(faces) == 0:
            return None
        x, y, w, h = faces[np.argmax(faces[:, 2])]
        cx, cy = x + w // 2, y + h // 2
        half = int(max(w, h) * 0.75)
        return [cx - half, cy - half, half * 2, half * 2]

    T = len(frames)
    boxes, current_box = [], None
    for i in range(T):
        if i % detection_freq == 0:
            b = _detect(frames[i])
            if b is not None:
                current_box = b
        boxes.append(current_box)

    face_box = next((b for b in boxes if b is not None), None)

    H_f, W_f = frames.shape[1], frames.shape[2]
    cropped = []
    for i, frame in enumerate(frames):
        box = boxes[i]
        if box is None:
            cropped.append(cv2.resize(frame, (img_size, img_size), interpolation=cv2.INTER_AREA))
        else:
            bx, by, bw, bh = box
            x1, y1 = max(0, bx), max(0, by)
            x2, y2 = min(W_f, bx + bw), min(H_f, by + bh)
            crop = frame[y1:y2, x1:x2]
            if crop.size == 0:
                crop = frame
            cropped.append(cv2.resize(crop, (img_size, img_size), interpolation=cv2.INTER_AREA))
    return np.array(cropped, dtype=np.float32), face_box


def _run_inference(frames_cropped, model, cfg, device):
    fd = cfg["frame_depth"]
    internal_diff = cfg.get("internal_diff", False)
    data_format = cfg.get("data_format", "NDCHW")
    unsqueeze_dim = cfg.get("unsqueeze_dim", None)
    n_take = fd + (1 if internal_diff else 0)
    T = len(frames_cropped)
    all_preds = []
    with torch.no_grad():
        for start in range(0, T - n_take + 1, fd):
            chunk = frames_cropped[start: start + n_take]
            data = _preprocess_frames(chunk, cfg["data_type"], data_format)
            tensor = torch.from_numpy(data).to(device)

            if data_format == "NCDHW":
                tensor = tensor.unsqueeze(0)
            elif unsqueeze_dim is not None:
                tensor = tensor.unsqueeze(unsqueeze_dim)

            out = model(tensor)
            if isinstance(out, tuple):
                out = out[0]
            all_preds.extend(out.cpu().numpy().flatten().tolist())
    return np.array(all_preds, dtype=np.float32)


class RPPGServiceImpl(IRPPGService):
    def analyze_video(self, video_path: str, model_key: str, device: str) -> RPPGAnalysisResult:
        if model_key not in _MODEL_INFO:
            raise ValueError("Invalid model_key")

        frames_rgb, fps = _read_video_frames(video_path)
        n_frames = len(frames_rgb)
        duration_s = n_frames / fps
        if duration_s < 5.0:
            raise ValueError(f"Video too short ({duration_s:.1f}s). Need >= 5 s.")

        model, model_cfg = _load_model(model_key, device)
        img_size = model_cfg["img_size"]
        frames_cropped, face_box = _detect_and_crop_faces(frames_rgb, img_size)
        preds = _run_inference(frames_cropped, model, model_cfg, device)

        preds = np.where(np.isfinite(preds), preds, 0.0)
        signal_filtered = _bandpass(preds, fps)
        signal_filtered = np.where(np.isfinite(signal_filtered), signal_filtered, 0.0)

        # H3: replaced bare `except` with `except Exception` — prevents catching SystemExit etc.
        try:
            hr_fft = float(_calculate_fft_hr(signal_filtered, fs=fps))
        except Exception as e:
            logger.warning("FFT HR calculation failed, falling back to peak HR: %s", e)
            hr_fft = float(_calculate_peak_hr(signal_filtered, fps))

        try:
            hr_peak = float(_calculate_peak_hr(signal_filtered, fps))
        except Exception as e:
            logger.warning("Peak HR calculation failed, using FFT HR: %s", e)
            hr_peak = hr_fft

        freqs = np.fft.rfftfreq(len(signal_filtered), d=1.0 / fps)
        power = np.abs(np.fft.rfft(signal_filtered)) ** 2
        mask  = (freqs >= 0.5) & (freqs <= 4.0)

        # ── Tính các chỉ số phái sinh ──
        hrv_ms = _compute_hrv_rmssd(signal_filtered, fps)
        stress_info = infer_stress_from_bvp(signal_filtered, fps)
        stress_level = stress_info.get("stress_level")
        if stress_level is None:
            # Backward-compatible fallback when model/path/feature extraction is unavailable.
            stress_level = _compute_stress(hrv_ms)
            logger.info("Stress level fallback used (RMSSD mapping), hrv_ms=%s", hrv_ms)
        else:
            logger.info("Stress level inferred by ML model, rr_count=%s", stress_info.get("rr_count"))
        return RPPGAnalysisResult(
            hr_fft=_sanitize_float(round(hr_fft, 1)),
            hr_peak=_sanitize_float(round(hr_peak, 1)),
            stress_level=stress_level,
            hrv_ms=hrv_ms,
            duration=round(n_frames / fps, 1),
            fps=round(fps, 1),
            n_frames=n_frames,
            face_detected=face_box is not None,
            signal=_sanitize_list(signal_filtered.tolist()),
            time_axis=(np.arange(len(signal_filtered)) / fps).tolist(),
            freq_axis=_sanitize_list((freqs[mask] * 60).tolist()),
            power=_sanitize_list(power[mask].tolist())
        )
