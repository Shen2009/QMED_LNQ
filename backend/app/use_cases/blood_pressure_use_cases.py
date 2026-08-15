from app.adapters.services.blood_pressure_service import IBloodPressureService
from app.domain.entities.blood_pressure import (
    BloodPressureInferenceInput,
    BloodPressureInferenceResult,
)


class BloodPressureUseCase:
    def __init__(self, blood_pressure_service: IBloodPressureService):
        self.blood_pressure_service = blood_pressure_service

    def process_video(self, video_path: str, device: str = "cpu") -> BloodPressureInferenceResult:
        input_data = BloodPressureInferenceInput(video_path=video_path, device=device)
        return self.blood_pressure_service.analyze_from_video(input_data)
