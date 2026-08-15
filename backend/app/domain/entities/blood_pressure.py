from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class BloodPressureInferenceInput(BaseModel):
    video_path: str
    device: str = "cpu"
    model_path: Optional[str] = None


class BloodPressureWindowPrediction(BaseModel):
    window_index: int
    systolic: float
    diastolic: float


class BloodPressureInferenceResult(BaseModel):
    systolic_avg: Optional[float] = Field(None, description="Average systolic blood pressure (mmHg)")
    diastolic_avg: Optional[float] = Field(None, description="Average diastolic blood pressure (mmHg)")
    predictions: List[BloodPressureWindowPrediction] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    debug_info: Dict[str, Any] = Field(default_factory=dict)
