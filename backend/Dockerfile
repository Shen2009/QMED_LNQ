# =============================================================================
# Q-Med Backend — Multi-Stage Dockerfile (SQLite)
# =============================================================================
# Stage 1: builder — install dependencies
# Stage 2: production — minimal runtime (no external DB needed)
# =============================================================================

# --------------- Stage 1: builder ---------------
FROM python:3.11-slim AS builder

# Prevent Python from writing .pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=1000

WORKDIR /install

# Install system-level audio codec support (ffmpeg required to decode M4A/AAC from mobile)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Copy only requirements first for optimal layer caching
COPY requirements.txt .

# Install deps into /install/packages (isolates from system Python)
RUN pip install --prefix=/install/packages --no-cache-dir -r requirements.txt


# --------------- Stage 2: production ---------------
FROM python:3.11-slim AS production

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install ffmpeg in the production stage — needed at runtime by librosa/audioread to decode M4A/AAC
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user + data dir for SQLite file
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/bash -m appuser && \
    mkdir -p /app/data && \
    mkdir -p /home/appuser/.cache/huggingface && \
    chown -R appuser:appgroup /app/data /home/appuser/.cache

# Copy installed packages from builder stage
COPY --from=builder /install/packages /usr/local

WORKDIR /app

# Copy application code with proper ownership
COPY --chown=appuser:appgroup app/ ./app/
COPY --chown=appuser:appgroup rPPG/ ./rPPG/
COPY --chown=appuser:appgroup ml_models/ ./ml_models/

# Switch to non-root user
USER 1001

EXPOSE 6789

# Health check using the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:6789/health')" || exit 1

# Production server: single worker — GPU model servers must not share VRAM across processes.
# Scale horizontally via multiple containers instead of multiple workers per container.
CMD ["python", "-m", "uvicorn", "app.infrastructure.web.main:app", \
     "--host", "0.0.0.0", \
     "--port", "6789", \
     "--workers", "1", \
     "--access-log", \
     "--log-level", "info"]
