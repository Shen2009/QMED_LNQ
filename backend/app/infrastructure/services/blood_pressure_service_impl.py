import logging
from pathlib import Path
from typing import List

import cv2
import numpy as np
import torch
import torch.nn as nn
from scipy.signal import butter, detrend, filtfilt

from app.adapters.services.blood_pressure_service import IBloodPressureService
from app.domain.entities.blood_pressure import (
    BloodPressureInferenceInput,
    BloodPressureInferenceResult,
    BloodPressureWindowPrediction,
)

logger = logging.getLogger(__name__)

_BASE_DIR = Path(__file__).resolve().parents[3]  # backend/
_EXTERNAL_REPO_DIR = _BASE_DIR / "external" / "Blood-Pressure-Estimation-Using-remote-Photoplethysmographic-Signals"
_DEFAULT_MODEL_PATH = _EXTERNAL_REPO_DIR / "1-D_Resnet_val_2L.pth"
_MODEL_CACHE: dict[tuple[str, str], nn.Module] = {}


class ResidualBlock1D(nn.Module):
    def __init__(self, in_channels: int, out_channels: int, stride: int = 1, downsample: nn.Module | None = None):
        super().__init__()
        self.conv1 = nn.Conv1d(in_channels, out_channels, kernel_size=3, stride=stride, padding=1)
        self.bn1 = nn.BatchNorm1d(out_channels)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = nn.Conv1d(out_channels, out_channels, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm1d(out_channels)
        self.downsample = downsample

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        identity = x
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        if self.downsample is not None:
            identity = self.downsample(x)
        out = out + identity
        return self.relu(out)


class ResNet1D(nn.Module):
    def __init__(self, in_channels: int = 1, num_classes: int = 2):
        super().__init__()
        self.layer0 = nn.Sequential(
            nn.Conv1d(in_channels, 64, kernel_size=7, stride=2, padding=3),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.MaxPool1d(kernel_size=3, stride=2, padding=1),
        )
        self.layer1 = self._make_layer(64, 64, blocks=2)
        self.layer2 = self._make_layer(64, 128, blocks=2, stride=2)
        self.layer3 = self._make_layer(128, 256, blocks=2, stride=2)
        self.layer4 = self._make_layer(256, 512, blocks=2, stride=2)
        self.global_pool = nn.AdaptiveAvgPool1d(1)
        self.fc = nn.Linear(512, num_classes)

    def _make_layer(self, in_channels: int, out_channels: int, blocks: int, stride: int = 1) -> nn.Sequential:
        downsample = None
        if stride != 1 or in_channels != out_channels:
            downsample = nn.Sequential(
                nn.Conv1d(in_channels, out_channels, kernel_size=1, stride=stride),
                nn.BatchNorm1d(out_channels),
            )
        layers: List[nn.Module] = [ResidualBlock1D(in_channels, out_channels, stride, downsample)]
        for _ in range(1, blocks):
            layers.append(ResidualBlock1D(out_channels, out_channels))
        return nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.layer0(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        x = self.global_pool(x)
        x = torch.flatten(x, 1)
        return self.fc(x)


def _bandpass_filter(signal: np.ndarray, fs: float, low: float = 0.7, high: float = 3.0, order: int = 4) -> np.ndarray:
    nyq = 0.5 * fs
    b, a = butter(order, [low / nyq, high / nyq], btype="band")
    return filtfilt(b, a, signal)


def _normalize_signal(signal: np.ndarray) -> np.ndarray:
    signal_min = float(np.min(signal))
    signal_max = float(np.max(signal))
    denom = signal_max - signal_min
    if denom <= 1e-8:
        return np.zeros_like(signal, dtype=np.float32)
    return ((signal - signal_min) / denom).astype(np.float32)


def _get_face_mask(landmarks, img_shape) -> np.ndarray:
    face_idx = list(range(468))
    h, w = img_shape
    points = np.array([(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in face_idx])
    hull = cv2.convexHull(points)
    mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillConvexPoly(mask, hull, 255)
    return mask


def _extract_ppg_signal(video_path: str) -> tuple[np.ndarray, float, int]:
    try:
        import mediapipe as mp
    except ImportError as exc:
        raise ImportError(
            "mediapipe is required for blood pressure inference. Install with: pip install mediapipe==0.10.14"
        ) from exc

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Cannot open video file")

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 30.0)
    signal_values: List[float] = []
    frame_count = 0

    with mp.solutions.face_mesh.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as face_mesh:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_count += 1
            img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = face_mesh.process(img_rgb)
            if not result.multi_face_landmarks:
                continue

            landmarks = result.multi_face_landmarks[0].landmark
            mask = _get_face_mask(landmarks, frame.shape[:2])
            green_channel = frame[:, :, 1]
            skin_pixels = green_channel[mask > 0]
            if skin_pixels.size == 0:
                continue

            signal_values.append(float(np.mean(skin_pixels)))

    cap.release()

    if len(signal_values) < 500:
        raise ValueError(f"Insufficient extracted rPPG samples ({len(signal_values)}). Need at least 500.")

    raw_signal = np.array(signal_values, dtype=np.float32)
    detrended = detrend(raw_signal)
    filtered = _bandpass_filter(detrended, fps)
    normalized = _normalize_signal(filtered)

    return normalized, fps, frame_count


def _load_bp_model(model_path: str, device: torch.device) -> ResNet1D:
    cache_key = (model_path, str(device))
    if cache_key in _MODEL_CACHE:
        return _MODEL_CACHE[cache_key]

    model = ResNet1D(in_channels=1, num_classes=2).to(device)
    state = torch.load(model_path, map_location=device)

    if isinstance(state, dict) and "state_dict" in state:
        state = state["state_dict"]

    # Handle checkpoints saved from DataParallel modules.
    if any(k.startswith("module.") for k in state.keys()):
        state = {k.replace("module.", "", 1): v for k, v in state.items()}

    model.load_state_dict(state, strict=False)
    model.eval()
    _MODEL_CACHE[cache_key] = model
    return model


class BloodPressureServiceImpl(IBloodPressureService):
    def analyze_from_video(self, input_data: BloodPressureInferenceInput) -> BloodPressureInferenceResult:
        model_path = input_data.model_path or str(_DEFAULT_MODEL_PATH)
        if not Path(model_path).exists():
            raise ValueError(f"Blood pressure model not found: {model_path}")

        device = torch.device(input_data.device)
        signal, fps, frame_count = _extract_ppg_signal(input_data.video_path)

        window_size = 437
        step_size = 10
        predictions: List[BloodPressureWindowPrediction] = []

        model = _load_bp_model(model_path, device)

        with torch.no_grad():
            for idx, start in enumerate(range(0, len(signal) - window_size, step_size)):
                segment = signal[start:start + window_size]
                tensor = torch.tensor(segment, dtype=torch.float32).unsqueeze(0).unsqueeze(0).to(device)
                pred = model(tensor).cpu().numpy().flatten()
                predictions.append(
                    BloodPressureWindowPrediction(
                        window_index=idx,
                        systolic=float(pred[0]),
                        diastolic=float(pred[1]),
                    )
                )

        if not predictions:
            raise ValueError("No prediction windows were produced from this video.")

        systolic_values = np.array([p.systolic for p in predictions], dtype=np.float32)
        diastolic_values = np.array([p.diastolic for p in predictions], dtype=np.float32)

        return BloodPressureInferenceResult(
            systolic_avg=round(float(np.mean(systolic_values)), 2),
            diastolic_avg=round(float(np.mean(diastolic_values)), 2),
            predictions=predictions,
            metadata={
                "fps": round(float(fps), 2),
                "frame_count": frame_count,
                "signal_length": int(len(signal)),
                "window_size": window_size,
                "step_size": step_size,
                "num_windows": len(predictions),
                "model_path": model_path,
            },
            debug_info={
                "repo_source": str(_EXTERNAL_REPO_DIR),
            },
        )
