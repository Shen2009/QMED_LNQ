import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.infrastructure.database.database import get_db
from app.infrastructure.database.models import User, MeasurementRecord
from app.infrastructure.security.auth import get_current_user
from app.domain.entities.history import (
    MeasurementRecordCreate,
    MeasurementRecordResponse,
    MeasurementType,
)
from app.infrastructure.logging.audit import log_history_save

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/history", tags=["History"])

# All valid measurement types — kept in sync with domain Literal
_ALL_TYPES: List[str] = ["face-rppg", "contact-ppg", "voice", "scg", "stress", "health-exam", "heartbeat", "blood-pressure", "sleep"]


def _record_to_response(record: MeasurementRecord) -> MeasurementRecordResponse:
    return MeasurementRecordResponse(
        id=record.id,
        user_id=record.user_id,
        type=record.type,
        result=json.loads(record.result) if record.result else {},
        pre_exam_context=json.loads(record.pre_exam_context) if record.pre_exam_context else None,
        measured_at=record.measured_at,
    )


@router.post("/save", response_model=MeasurementRecordResponse, status_code=status.HTTP_201_CREATED)
def save_record(
    data: MeasurementRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lưu 1 kết quả đo lường.
    Yêu cầu Bearer token.
    """
    record = MeasurementRecord(
        user_id=current_user.id,
        type=data.type,
        result=json.dumps(data.result, ensure_ascii=False),
        pre_exam_context=(
            json.dumps(data.pre_exam_context.model_dump(), ensure_ascii=False)
            if data.pre_exam_context else None
        ),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    log_history_save(current_user.id, data.type, record.id)
    logger.info("History saved: user_id=%d type=%s record_id=%d", current_user.id, data.type, record.id)
    return _record_to_response(record)


@router.get("/list", response_model=List[MeasurementRecordResponse])
def list_records(
    response: Response,
    # M7: renamed from `type` (shadows Python built-in) → `record_type` with Query alias
    record_type: Optional[MeasurementType] = Query(
        None, alias="type", description="Lọc theo loại đo: face-rppg, voice, scg, ..."
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách lịch sử đo của user (mới nhất trước).
    Yêu cầu Bearer token.
    M8: Trả về X-Total-Count header để client biết tổng số bản ghi.
    """
    query = db.query(MeasurementRecord).filter_by(user_id=current_user.id)
    if record_type:
        query = query.filter(MeasurementRecord.type == record_type)

    total = query.count()                    # M8: count for pagination metadata
    records = (
        query.order_by(MeasurementRecord.measured_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    logger.debug(
        "History list: user_id=%d type=%s page=%d total=%d",
        current_user.id, record_type or "all", page, total,
    )
    # M8: expose total count in response header
    response.headers["X-Total-Count"] = str(total)
    return [_record_to_response(r) for r in records]


@router.get("/latest", response_model=List[MeasurementRecordResponse])
def get_latest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Lấy bản ghi mới nhất của MỖI loại đo.
    Frontend dùng để hiển thị vitals trên HomeScreen.
    Yêu cầu Bearer token.
    """
    results = []
    for t in _ALL_TYPES:
        record = (
            db.query(MeasurementRecord)
            .filter_by(user_id=current_user.id, type=t)
            .order_by(MeasurementRecord.measured_at.desc())
            .first()
        )
        if record:
            results.append(_record_to_response(record))
    return results