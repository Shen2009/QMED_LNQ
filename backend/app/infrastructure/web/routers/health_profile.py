import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.infrastructure.database.database import get_db
from app.infrastructure.database.models import User, UserHealthProfile
from app.infrastructure.security.auth import get_current_user
from app.domain.entities.health_profile import HealthProfileCreate, HealthProfileResponse
from app.infrastructure.logging.audit import log_profile_upsert

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/profile", tags=["Health Profile"])


def _serialize(value) -> Optional[str]:
    """Chuyển list → JSON string để lưu vào Text column"""
    if value is None:
        return None
    if isinstance(value, list):
        return json.dumps(value, ensure_ascii=False)
    return value


def _deserialize_list(value: Optional[str]) -> list:
    """Đọc JSON string từ DB → list"""
    if not value:
        return []
    try:
        return json.loads(value)
    except Exception:
        return []


def _profile_to_response(profile: UserHealthProfile) -> HealthProfileResponse:
    return HealthProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        birth_year=profile.birth_year,
        gender=profile.gender,
        height_cm=profile.height_cm,
        weight_kg=profile.weight_kg,
        cardiovascular=_deserialize_list(profile.cardiovascular),
        diabetes=profile.diabetes,
        respiratory=_deserialize_list(profile.respiratory),
        kidney_liver=bool(profile.kidney_liver),
        anxiety_depression=bool(profile.anxiety_depression),
        current_medications=profile.current_medications,
        family_history=_deserialize_list(profile.family_history),
        smoking=profile.smoking,
        alcohol=profile.alcohol,
        exercise=profile.exercise,
        diet=profile.diet,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.post("/health", response_model=HealthProfileResponse, status_code=status.HTTP_200_OK)
def upsert_health_profile(
    data: HealthProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Tạo hoặc cập nhật hồ sơ sức khoẻ.
    Gọi sau khi đăng nhập lần đầu (ProfileSetupScreen).
    Yêu cầu Bearer token.
    """
    profile = db.query(UserHealthProfile).filter_by(user_id=current_user.id).first()

    is_new = not bool(profile)
    if is_new:
        profile = UserHealthProfile(user_id=current_user.id)
        db.add(profile)

    profile.birth_year = data.birth_year
    profile.gender = data.gender
    profile.height_cm = data.height_cm
    profile.weight_kg = data.weight_kg
    profile.cardiovascular = _serialize(data.cardiovascular)
    profile.diabetes = data.diabetes
    profile.respiratory = _serialize(data.respiratory)
    profile.kidney_liver = data.kidney_liver
    profile.anxiety_depression = data.anxiety_depression
    profile.current_medications = data.current_medications
    profile.family_history = _serialize(data.family_history)
    profile.smoking = data.smoking
    profile.alcohol = data.alcohol
    profile.exercise = data.exercise
    profile.diet = data.diet

    db.commit()
    db.refresh(profile)
    log_profile_upsert(current_user.id, is_new=is_new)
    logger.info(
        "Health profile %s: user_id=%d",
        "created" if is_new else "updated", current_user.id,
    )
    return _profile_to_response(profile)


@router.get("/health", response_model=HealthProfileResponse)
def get_health_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lấy hồ sơ sức khoẻ của user hiện tại.
    Trả 404 nếu chưa setup (frontend dùng để biết cần redirect ProfileSetup).
    Yêu cầu Bearer token.
    """
    profile = db.query(UserHealthProfile).filter_by(user_id=current_user.id).first()
    if not profile:
        logger.warning("Health profile not found: user_id=%d", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health profile chưa được thiết lập"
        )
    logger.debug("Health profile fetched: user_id=%d", current_user.id)
    return _profile_to_response(profile)
