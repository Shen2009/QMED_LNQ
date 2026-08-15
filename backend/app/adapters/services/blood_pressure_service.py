from abc import ABC, abstractmethod

from app.domain.entities.blood_pressure import (
    BloodPressureInferenceInput,
    BloodPressureInferenceResult,
)


class IBloodPressureService(ABC):
    @abstractmethod
    def analyze_from_video(self, input_data: BloodPressureInferenceInput) -> BloodPressureInferenceResult:
        """Estimate systolic/diastolic blood pressure from a face video."""
        pass
