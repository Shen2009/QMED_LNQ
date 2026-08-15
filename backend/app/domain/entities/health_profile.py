from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class HealthProfileCreate(BaseModel):
    # Step 1
    birth_year: Optional[int] = None
    gender: Optional[str] = None          # male | female | other
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None

    # Step 2
    cardiovascular: Optional[List[str]] = []   # ["hypertension", "arrhythmia", "congenital"]
    diabetes: Optional[str] = "none"           # none | type1 | type2
    respiratory: Optional[List[str]] = []      # ["asthma", "copd"]
    kidney_liver: Optional[bool] = False
    anxiety_depression: Optional[bool] = False
    current_medications: Optional[str] = None

    # Step 3
    family_history: Optional[List[str]] = []   # ["heart_disease","stroke","diabetes","hypertension","cancer"]

    # Step 4
    smoking: Optional[str] = "never"           # never | former | current
    alcohol: Optional[str] = "none"            # none | occasional | frequent
    exercise: Optional[str] = "none"           # none | 1-2x | 3-5x
    diet: Optional[str] = "normal"             # normal | low-salt | diet


class HealthProfileResponse(BaseModel):
    id: int
    user_id: int
    birth_year: Optional[int]
    gender: Optional[str]
    height_cm: Optional[float]
    weight_kg: Optional[float]
    cardiovascular: Optional[List[str]]
    diabetes: Optional[str]
    respiratory: Optional[List[str]]
    kidney_liver: bool
    anxiety_depression: bool
    current_medications: Optional[str]
    family_history: Optional[List[str]]
    smoking: Optional[str]
    alcohol: Optional[str]
    exercise: Optional[str]
    diet: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}
