from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel


# M6: strict Literal type prevents typos in measurement type strings
MeasurementType = Literal["face-rppg", "contact-ppg", "voice", "scg", "stress", "health-exam", "heartbeat", "blood-pressure"]

class PreExamContext(BaseModel):
    """Context thu thập ngay trước mỗi lần đo"""
    slept_well: Optional[bool] = None
    caffeine_recently: Optional[bool] = None
    exercised_recently: Optional[bool] = None


class MeasurementRecordCreate(BaseModel):
    type: MeasurementType                  # face-rppg | contact-ppg | voice | scg | stress | health-exam | heartbeat
    result: Dict[str, Any]                 # kết quả đo dạng dict
    pre_exam_context: Optional[PreExamContext] = None


class MeasurementRecordResponse(BaseModel):
    id: int
    user_id: int
    type: str
    result: Dict[str, Any]
    pre_exam_context: Optional[Dict[str, Any]]
    measured_at: datetime

    model_config = {"from_attributes": True}
