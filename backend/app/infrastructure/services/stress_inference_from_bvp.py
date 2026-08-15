import logging
import math
import os
import pickle
import importlib
from typing import Any, Dict, Optional

import numpy as np
from scipy.signal import find_peaks
from scipy.stats import kurtosis

logger = logging.getLogger(__name__)

FEATURE_ORDER = (
    "KURT",
    "VLF",
    "MEAN_REL_RR",
    "HR_HF",
    "pNN25",
    "KURT_REL_RR",
    "TP",
    "MEDIAN_REL_RR_LOG",
)

_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DEFAULT_STRESS_MODEL_PATH = os.path.join(_BACKEND_ROOT, "ml_models", "8features_to_stress.pkl")

_model_cache: Dict[str, Any] = {}


def _load_hrvanalysis_module() -> Any:
    return importlib.import_module("hrvanalysis")


def _resolve_model_path(explicit_path: Optional[str] = None) -> str:
    if explicit_path:
        return explicit_path
    return os.getenv("STRESS_MODEL_PATH", DEFAULT_STRESS_MODEL_PATH)


def _load_model(model_path: str) -> Any:
    if model_path in _model_cache:
        return _model_cache[model_path]

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Stress model not found at path: {model_path}")

    with open(model_path, "rb") as model_file:
        model = pickle.load(model_file)

    _model_cache[model_path] = model
    return model


def _extract_rr_intervals_ms(signal: np.ndarray, fps: float) -> np.ndarray:
    if fps <= 0:
        raise ValueError("fps must be > 0")

    min_dist = max(1, int(fps * 0.35))
    prominence = float(np.std(signal) * 0.15)
    peaks, _ = find_peaks(signal, distance=min_dist, prominence=prominence)

    if len(peaks) < 4:
        return np.array([], dtype=np.float64)

    rr_ms = np.diff(peaks) / fps * 1000.0
    rr_ms = rr_ms[(rr_ms >= 300.0) & (rr_ms <= 2000.0)]
    return rr_ms.astype(np.float64)


def _prepare_nni(rr_ms: np.ndarray) -> np.ndarray:
    hrva = _load_hrvanalysis_module()
    rr_list = rr_ms.tolist()
    rr_no_outliers = hrva.remove_outliers(rr_list, low_rri=300, high_rri=2000)
    rr_no_ectopic = hrva.remove_ectopic_beats(rr_no_outliers, method="malik")
    rr_interpolated = hrva.interpolate_nan_values(rr_no_ectopic, interpolation_method="linear")
    return np.asarray(rr_interpolated, dtype=np.float64)


def _build_feature_vector(rr_ms: np.ndarray) -> np.ndarray:
    hrva = _load_hrvanalysis_module()
    nni = _prepare_nni(rr_ms)
    if nni.size < 4:
        raise ValueError("Not enough NN intervals after cleaning")

    freq_features = hrva.get_frequency_domain_features(nni.tolist())

    rr_diff = np.diff(nni)
    rel_rr = rr_diff / nni[:-1] if nni.size > 1 else np.array([0.0], dtype=np.float64)

    pnn25 = 0.0
    if rr_diff.size > 0:
        pnn25 = float(np.mean(np.abs(rr_diff) > 25.0) * 100.0)

    mean_rr = float(np.mean(nni))
    hr_bpm = 60000.0 / mean_rr if mean_rr > 0 else 0.0
    hf_power = float(freq_features.get("hf", 0.0) or 0.0)
    hr_hf = hr_bpm / max(hf_power, 1e-6)

    kurt_rr = float(kurtosis(nni, fisher=False, bias=False))
    kurt_rel_rr = float(kurtosis(rel_rr, fisher=False, bias=False)) if rel_rr.size > 3 else 0.0

    mean_rel_rr = float(np.mean(rel_rr)) if rel_rr.size else 0.0
    median_rel_rr = float(np.median(rel_rr)) if rel_rr.size else 0.0
    median_rel_rr_log = float(np.log1p(abs(median_rel_rr)))

    feature_map = {
        "KURT": kurt_rr,
        "VLF": float(freq_features.get("vlf", 0.0) or 0.0),
        "MEAN_REL_RR": mean_rel_rr,
        "HR_HF": hr_hf,
        "pNN25": pnn25,
        "KURT_REL_RR": kurt_rel_rr,
        "TP": float(freq_features.get("total_power", 0.0) or 0.0),
        "MEDIAN_REL_RR_LOG": median_rel_rr_log,
    }

    feature_vector = np.array([feature_map[name] for name in FEATURE_ORDER], dtype=np.float64)
    if not np.all(np.isfinite(feature_vector)):
        raise ValueError("Feature vector contains NaN or infinite values")

    return feature_vector


def _predict_stress_score(model: Any, feature_vector: np.ndarray) -> float:
    features_2d = feature_vector.reshape(1, -1)

    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(features_2d)
        if probs.ndim == 2 and probs.shape[1] > 1:
            score_01 = float(probs[0, 1])
        else:
            score_01 = float(np.ravel(probs)[0])
        return max(0.0, min(100.0, score_01 * 100.0))

    if hasattr(model, "decision_function"):
        margin = float(np.ravel(model.decision_function(features_2d))[0])
        score_01 = 1.0 / (1.0 + math.exp(-margin))
        return max(0.0, min(100.0, score_01 * 100.0))

    pred = float(np.ravel(model.predict(features_2d))[0])
    if 0.0 <= pred <= 1.0:
        pred *= 100.0
    return max(0.0, min(100.0, pred))


def infer_stress_from_bvp(
    bvp_signal: np.ndarray,
    fps: float,
    model_path: Optional[str] = None,
) -> Dict[str, Optional[float]]:
    """Infer stress score (0-100) from an extracted BVP signal."""
    result: Dict[str, Optional[float]] = {
        "stress_level": None,
        "rr_count": None,
    }

    try:
        rr_ms = _extract_rr_intervals_ms(bvp_signal, fps)
        result["rr_count"] = float(rr_ms.size)
        if rr_ms.size < 4:
            return result

        features = _build_feature_vector(rr_ms)
        resolved_path = _resolve_model_path(model_path)
        model = _load_model(resolved_path)
        stress_score = _predict_stress_score(model, features)
        result["stress_level"] = round(stress_score, 1)
        logger.info(
            "Stress inference success: model=%s rr_count=%s score=%s",
            resolved_path,
            int(rr_ms.size),
            result["stress_level"],
        )
        return result
    except Exception as exc:
        logger.warning("Stress inference from BVP skipped: %s", exc)
        return result
