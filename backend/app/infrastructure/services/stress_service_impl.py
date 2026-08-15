import logging
import numpy as np
from app.adapters.services.stress_service import IStressService
from app.domain.entities.stress import StressInferenceInput, StressInferenceResult, StressFeatures
from app.infrastructure.services.rppg_service_impl import (
    _read_video_frames,
    _detect_and_crop_faces,
    _load_model,
    _run_inference,
    _bandpass,
    _MODEL_INFO,
    _compute_hrv_rmssd
)
from app.infrastructure.services.stress_inference_from_bvp import (
    _extract_rr_intervals_ms,
    _build_feature_vector,
    _predict_stress_score,
    _resolve_model_path,
    _load_model as _load_stress_model,
    FEATURE_ORDER
)

logger = logging.getLogger(__name__)

class StressServiceImpl(IStressService):
    def analyze_stress_from_video(self, input_data: StressInferenceInput) -> StressInferenceResult:
        # Phase 2: Video to BVP
        if input_data.model_key not in _MODEL_INFO:
            raise ValueError(f"Invalid model_key: {input_data.model_key}")

        frames_rgb, fps = _read_video_frames(input_data.video_path)
        if input_data.fps:
            fps = input_data.fps

        n_frames = len(frames_rgb)
        duration_s = n_frames / fps if fps > 0 else 0
        if duration_s < 5.0:
            raise ValueError(f"Video too short ({duration_s:.1f}s). Need >= 5 s.")

        model, model_cfg = _load_model(input_data.model_key, input_data.device)
        img_size = model_cfg["img_size"]
        frames_cropped, face_box = _detect_and_crop_faces(frames_rgb, img_size)
        if face_box is None:
            raise ValueError("Không nhận diện được khuôn mặt. Hãy giữ mặt trong khung và đảm bảo đủ ánh sáng.")
        preds = _run_inference(frames_cropped, model, model_cfg, input_data.device)
        
        preds = np.where(np.isfinite(preds), preds, 0.0)
        signal_filtered = _bandpass(preds, fps)
        signal_filtered = np.where(np.isfinite(signal_filtered), signal_filtered, 0.0)

        quality_flags = {
            "face_detected": face_box is not None,
            "duration": float(duration_s),
            "signal_length": len(signal_filtered)
        }
        metadata = {"fps": fps, "n_frames": n_frames}
        debug_info = {}

        # Phase 3 & 4: RR to features to Model Inference
        try:
            rr_ms = _extract_rr_intervals_ms(signal_filtered, fps)
            debug_info["rr_count"] = int(rr_ms.size)
            
            if rr_ms.size < 4:
                raise ValueError("Tín hiệu nhịp tim chưa đủ rõ để phân tích stress. Hãy giữ yên điện thoại và đo lại.")

            features_vector = _build_feature_vector(rr_ms)
            
            # Map back to DTO
            features_dict = dict(zip(FEATURE_ORDER, features_vector))
            stress_features = StressFeatures(**features_dict)

            stress_model_path = _resolve_model_path()
            stress_model = _load_stress_model(stress_model_path)
            stress_score = _predict_stress_score(stress_model, features_vector)

            # Compute HRV (RMSSD) — pass the filtered signal + fps, not rr_ms
            hrv_rmssd = _compute_hrv_rmssd(signal_filtered, fps)
            hrv_ms = hrv_rmssd if hrv_rmssd is not None else float(np.sqrt(np.mean(np.diff(rr_ms) ** 2))) if rr_ms.size > 1 else 0.0

            debug_info["success"] = True
            
            return StressInferenceResult(
                stress_score=round(stress_score, 1),
                hrv_ms=round(hrv_ms, 2),
                features=stress_features,
                signal_quality=quality_flags,
                metadata=metadata,
                debug_info=debug_info
            )

        except ValueError:
            raise
        except Exception as e:
            logger.warning("Stress feature/inference failed", exc_info=True)
            raise ValueError(f"Không thể hoàn tất phân tích stress: {e}") from e
