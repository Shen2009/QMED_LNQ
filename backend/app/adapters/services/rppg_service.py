from abc import ABC, abstractmethod
from app.domain.entities.rppg import RPPGAnalysisResult

class IRPPGService(ABC):
    @abstractmethod
    def analyze_video(self, video_path: str, model_key: str, device: str) -> RPPGAnalysisResult:
        pass
