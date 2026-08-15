from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class StressFeatures(BaseModel):
    """
    Quy uoc feature order bat buoc (khong duoc sap xep lai):
    KURT, VLF, MEAN_REL_RR, HR_HF, pNN25, KURT_REL_RR, TP, MEDIAN_REL_RR_LOG
    """
    KURT: float
    VLF: float
    MEAN_REL_RR: float
    HR_HF: float
    pNN25: float
    KURT_REL_RR: float
    TP: float
    MEDIAN_REL_RR_LOG: float

    def to_vector(self) -> List[float]:
        return [
            self.KURT,
            self.VLF,
            self.MEAN_REL_RR,
            self.HR_HF,
            self.pNN25,
            self.KURT_REL_RR,
            self.TP,
            self.MEDIAN_REL_RR_LOG
        ]

class StressInferenceInput(BaseModel):
    video_path: str
    fps: Optional[float] = None
    model_key: str = "FactorizePhys (UBFC-rPPG)"
    device: str = "cpu"

class StressInferenceResult(BaseModel):
    stress_score: Optional[float] = Field(None, description="0 to 100 stress score")
    hrv_ms: Optional[float] = Field(None, description="RMSSD in milliseconds")
    features: Optional[StressFeatures] = None
    signal_quality: Dict[str, Any] = Field(default_factory=dict, description="Flags or info regarding BVP signal quality")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="fps, n_frames, duration, etc")
    debug_info: Dict[str, Any] = Field(default_factory=dict, description="raw arrays, intermediate values for debugging")
