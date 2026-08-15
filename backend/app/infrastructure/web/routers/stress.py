import os
import logging
import tempfile
import torch
from fastapi import APIRouter, Depends, Request, UploadFile, File, HTTPException

from app.use_cases.stress_use_cases import StressUseCase
from app.infrastructure.services.stress_service_impl import StressServiceImpl
from app.infrastructure.logging.audit import log_stress_analyse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/stress", tags=["Stress"])

def get_stress_use_case() -> StressUseCase:
    service = StressServiceImpl()
    return StressUseCase(service)

@router.post("/analyse")
async def analyse_video(
    request: Request,
    video: UploadFile = File(...),
    use_case: StressUseCase = Depends(get_stress_use_case),
):
    client_ip = request.client.host if request.client else "-"
    model_key = "FactorizePhys (UBFC-rPPG)"
    device    = "cuda:0" if torch.cuda.is_available() else "cpu"
    filename  = video.filename or "unknown"

    logger.info("Stress analyse start: file=%s device=%s ip=%s", filename, device, client_ip)

    suffix = os.path.splitext(filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = tmp.name
        content  = await video.read()
        tmp.write(content)

    try:
        result = use_case.process_stress_from_video(
            video_path=tmp_path,
            ip=client_ip,
            device=device,
            model_key=model_key
        )
        
        logger.info(
            "Stress analyse done: file=%s score=%s hrv=%s ip=%s",
            filename,
            result.stress_score,
            getattr(result, "hrv_ms", None),
            client_ip,
        )
        return result.model_dump()
    except ValueError as val_err:
        logger.warning("Stress analyse bad input: %s ip=%s", val_err, client_ip)
        raise HTTPException(status_code=422, detail=str(val_err))
    except Exception as e:
        logger.exception("Stress analyse error: file=%s ip=%s", filename, client_ip)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)
