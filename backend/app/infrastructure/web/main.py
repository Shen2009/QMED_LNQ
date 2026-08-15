import os
import time
import uuid
import asyncio
import logging
import logging.config
import torch
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Load backend/.env before importing services that read environment settings.
load_dotenv(Path(__file__).resolve().parents[3] / ".env")

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.infrastructure.database.database import engine, Base
from app.infrastructure.web.routers import auth
from app.infrastructure.web.routers import chatbot
from app.infrastructure.web.routers import rppg
from app.infrastructure.web.routers import health_profile
from app.infrastructure.web.routers import history
from app.infrastructure.web.routers import scg
from app.infrastructure.web.routers import heartbeat
from app.infrastructure.web.routers import stress
from app.infrastructure.web.routers import blood_pressure
from app.infrastructure.services.llm_service import llm_service

# ─── Centralized logging configuration ───────────────────────────────────────
logging.config.dictConfig({
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s [%(levelname)-8s] %(name)s — %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "audit": {
            "format": "%(asctime)s [AUDIT] %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
            "stream": "ext://sys.stdout",
        },
        "audit_console": {
            "class": "logging.StreamHandler",
            "formatter": "audit",
            "stream": "ext://sys.stdout",
        },
    },
    "loggers": {
        # Dedicated audit logger — can be redirected to file/SIEM later
        "qmed.audit": {
            "handlers": ["audit_console"],
            "level": "INFO",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
})

logger = logging.getLogger(__name__)

# Tạo tables (checkfirst=True tránh lỗi nếu bảng đã tồn tại)
Base.metadata.create_all(bind=engine, checkfirst=True)

# Rate limiter — shared across the app
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async def load_llm_in_background():
        try:
            await asyncio.to_thread(llm_service.load_model)
        except Exception as exc:
            logger.error("MedGemma background load failed: %s", exc)

    # Startup: Load the LLM model if HF_TOKEN is configured
    hf_token = os.getenv("HF_TOKEN")
    if hf_token:
        logger.info("HF_TOKEN found, initiating MedGemma load in background...")
        # Lên lịch load model trong background để không block việc khởi động server
        asyncio.create_task(load_llm_in_background())
    else:
        logger.warning("HF_TOKEN not found! MedGemma model will fail to load or download when chatting.")

    yield

    # Shutdown: free VRAM if model was loaded
    if llm_service.model:
        del llm_service.model
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


app = FastAPI(
    title="Q-Med API",
    description="API cho ứng dụng Q-Med - AI Health Monitoring",
    version="1.1.1",
    lifespan=lifespan,
)

# Attach rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — C2 FIX: allow_credentials=True requires explicit origins (not wildcard)
# Update CORS_ORIGINS in your .env for production deployments.
_cors_origins_env = os.getenv("CORS_ORIGINS", "")
_cors_origins = (
    [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
    if _cors_origins_env
    else ["http://localhost:8081", "http://localhost:3000", "http://10.0.2.2:8081"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(chatbot.router)
app.include_router(rppg.router)
app.include_router(health_profile.router)
app.include_router(history.router)
app.include_router(scg.router)
app.include_router(heartbeat.router)
app.include_router(stress.router)
app.include_router(blood_pressure.router)


@app.middleware("http")
async def access_log_middleware(request: Request, call_next) -> Response:
    """Log every HTTP request with method, path, status, latency, request_id, IP."""
    start_time = time.monotonic()
    req_id     = str(uuid.uuid4())[:8]
    client_ip  = request.client.host if request.client else "-"

    try:
        response: Response = await call_next(request)
    except Exception:
        logger.exception(
            "ACCESS %s %s ERROR [%s] ip=%s",
            request.method, request.url.path, req_id, client_ip,
        )
        raise

    elapsed_ms = (time.monotonic() - start_time) * 1000
    logger.info(
        "ACCESS %s %s %d %.1fms [%s] ip=%s",
        request.method, request.url.path,
        response.status_code, elapsed_ms, req_id, client_ip,
    )
    # Propagate request-id so clients can trace requests in logs
    response.headers["X-Request-Id"] = req_id
    return response


@app.get("/")
def root():
    return {"message": "Q-Med API is running", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
