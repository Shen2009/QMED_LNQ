from app.adapters.services.rppg_service import IRPPGService
from app.domain.entities.rppg import RPPGAnalysisResult

class RPPGUseCase:
    def __init__(self, rppg_service: IRPPGService):
        self._rppg_service = rppg_service

    def process_video(self, video_path: str, model_key: str, device: str) -> RPPGAnalysisResult:
        # Can add business validation rules here if needed
        return self._rppg_service.analyze_video(video_path, model_key, device)
