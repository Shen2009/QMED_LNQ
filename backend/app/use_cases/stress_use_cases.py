import logging
from app.adapters.services.stress_service import IStressService
from app.domain.entities.stress import StressInferenceInput, StressInferenceResult

logger = logging.getLogger(__name__)

from app.infrastructure.logging.audit import log_stress_analyse

class StressUseCase:
    def __init__(self, stress_service: IStressService):
        self.stress_service = stress_service

    def process_stress_from_video(self, video_path: str, model_key: str, device: str, ip: str = "-") -> StressInferenceResult:
        logger.info(f"Executing StressUseCase.process_stress_from_video for {video_path}")
        
        input_data = StressInferenceInput(
            video_path=video_path,
            model_key=model_key,
            device=device
        )
        
        try:
            result = self.stress_service.analyze_stress_from_video(input_data)
            success = result.debug_info.get("success", False)
            stress_score = result.stress_score
            log_stress_analyse(user_id=None, video_path=video_path, ip=ip, success=success, stress_score=stress_score)
            return result
        except Exception as e:
            log_stress_analyse(user_id=None, video_path=video_path, ip=ip, success=False, stress_score=None)
            raise e
