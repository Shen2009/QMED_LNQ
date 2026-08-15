from abc import ABC, abstractmethod
from app.domain.entities.stress import StressInferenceInput, StressInferenceResult

class IStressService(ABC):
    @abstractmethod
    def analyze_stress_from_video(self, input_data: StressInferenceInput) -> StressInferenceResult:
        """
        Analyze stress from a face video using rPPG BVP extraction and HRV feature inference.
        """
        pass
