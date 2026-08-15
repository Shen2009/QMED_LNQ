from datetime import datetime, timezone, timedelta
try:
    from zoneinfo import ZoneInfo
    VN_TZ = ZoneInfo("Asia/Ho_Chi_Minh")  # UTC+7, no DST
except ImportError:
    VN_TZ = timezone(timedelta(hours=7))  # fallback for Python < 3.9

from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, Text, ForeignKey

from app.infrastructure.database.database import Base


def _vn_now():
    """Return current Vietnam time (UTC+7) as a timezone-aware datetime."""
    return datetime.now(VN_TZ)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_vn_now)


class UserHealthProfile(Base):
    """Hồ sơ sức khoẻ — thu thập 1 lần khi đăng nhập lần đầu"""
    __tablename__ = "user_health_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    # Step 1 — Cơ bản
    birth_year = Column(Integer, nullable=True)
    gender = Column(String(10), nullable=True)          # male | female | other
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)

    # Step 2 — Tiền sử bản thân (JSON-encoded lists / enums stored as string)
    cardiovascular = Column(Text, nullable=True)        # JSON array: ["hypertension","arrhythmia",...]
    diabetes = Column(String(10), nullable=True)        # none | type1 | type2
    respiratory = Column(Text, nullable=True)           # JSON array: ["asthma","copd"]
    kidney_liver = Column(Boolean, default=False)
    anxiety_depression = Column(Boolean, default=False)
    current_medications = Column(Text, nullable=True)   # free text

    # Step 3 — Tiền sử gia đình
    family_history = Column(Text, nullable=True)        # JSON array: ["heart_disease","diabetes",...]

    # Step 4 — Lối sống
    smoking = Column(String(10), nullable=True)         # never | former | current
    alcohol = Column(String(15), nullable=True)         # none | occasional | frequent
    exercise = Column(String(15), nullable=True)        # none | 1-2x | 3-5x
    diet = Column(String(15), nullable=True)            # normal | low-salt | diet

    created_at = Column(DateTime(timezone=True), default=_vn_now)
    updated_at = Column(DateTime(timezone=True), default=_vn_now, onupdate=_vn_now)


class MeasurementRecord(Base):
    """Lịch sử các lần đo — mỗi lần đo lưu 1 record"""
    __tablename__ = "measurement_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Loại đo: face-rppg | voice | scg | stress | sleep | health-exam
    type = Column(String(20), nullable=False, index=True)

    # Kết quả đo (JSON string)
    result = Column(Text, nullable=False)

    # Context lúc đo (JSON string): slept_well, caffeine, exercised_recently
    pre_exam_context = Column(Text, nullable=True)

    measured_at = Column(DateTime(timezone=True), default=_vn_now, index=True)
