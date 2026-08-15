import os
import tempfile
import logging

import torch
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.infrastructure.logging.audit import log_bp_analyse
from app.infrastructure.services.blood_pressure_service_impl import BloodPressureServiceImpl
from app.use_cases.blood_pressure_use_cases import BloodPressureUseCase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/blood-pressure", tags=["Blood Pressure"])


def get_bp_use_case() -> BloodPressureUseCase:
    service = BloodPressureServiceImpl()
    return BloodPressureUseCase(service)


@router.post("/analyse")
async def analyse_blood_pressure(
    request: Request,
    video: UploadFile = File(...),
    use_case: BloodPressureUseCase = Depends(get_bp_use_case),
):
    client_ip = request.client.host if request.client else "-"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    filename = video.filename or "unknown"

    logger.info("BP analyse start: file=%s device=%s ip=%s", filename, device, client_ip)

    suffix = os.path.splitext(filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = tmp.name
        content = await video.read()
        tmp.write(content)

    try:
        result = use_case.process_video(tmp_path, device=device)
        log_bp_analyse(user_id=None, filename=filename, ip=client_ip, success=True)
        logger.info(
            "BP analyse done: file=%s sbp=%s dbp=%s ip=%s",
            filename,
            result.systolic_avg,
            result.diastolic_avg,
            client_ip,
        )
        return result.model_dump()
    except ValueError as val_err:
        log_bp_analyse(user_id=None, filename=filename, ip=client_ip, success=False)
        logger.warning("BP analyse bad input: %s ip=%s", val_err, client_ip)
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        log_bp_analyse(user_id=None, filename=filename, ip=client_ip, success=False)
        logger.exception("BP analyse error: file=%s ip=%s", filename, client_ip)
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        os.unlink(tmp_path)
