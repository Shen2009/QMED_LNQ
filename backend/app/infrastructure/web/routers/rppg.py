import os
import logging
import tempfile
import torch
from fastapi import APIRouter, Depends, Request, UploadFile, File, Form, HTTPException

from app.use_cases.rppg_use_cases import RPPGUseCase
from app.infrastructure.services.rppg_service_impl import RPPGServiceImpl
from app.infrastructure.logging.audit import log_rppg_analyse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/rppg", tags=["rPPG"])

def get_rppg_use_case() -> RPPGUseCase:
    service = RPPGServiceImpl()
    return RPPGUseCase(service)

@router.post("/analyse")
async def analyse_video(
    request: Request,
    video: UploadFile = File(...),
    use_case: RPPGUseCase = Depends(get_rppg_use_case),
):
    client_ip = request.client.host if request.client else "-"
    model_key = "FactorizePhys (UBFC-rPPG)"
    device    = "cuda:0" if torch.cuda.is_available() else "cpu"
    filename  = video.filename or "unknown"

    logger.info("rPPG analyse start: file=%s device=%s ip=%s", filename, device, client_ip)

    suffix = os.path.splitext(filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = tmp.name
        content  = await video.read()
        tmp.write(content)

    try:
        result = use_case.process_video(tmp_path, model_key, device)
        log_rppg_analyse(None, filename, client_ip, success=True)
        logger.info(
            "rPPG analyse done: file=%s hr_fft=%s ip=%s",
            filename, result.model_dump().get("hr_fft"), client_ip,
        )
        return result.model_dump()
    except ValueError as val_err:
        log_rppg_analyse(None, filename, client_ip, success=False)
        logger.warning("rPPG analyse bad input: %s ip=%s", val_err, client_ip)
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as e:
        log_rppg_analyse(None, filename, client_ip, success=False)
        logger.exception("rPPG analyse error: file=%s ip=%s", filename, client_ip)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)
