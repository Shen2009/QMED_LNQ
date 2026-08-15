#!/usr/bin/env bash
# =============================================================================
# slim-build.sh — Minify Q-Med backend image using SlimToolkit
# =============================================================================
# Requires:
#   - slim CLI installed  (https://github.com/slimtoolkit/slim)
#   - Docker running
#   - qmed-backend:latest already built (run 'make build' first)
#
# Usage:
#   bash slim-build.sh              # Interactive (default)
#   bash slim-build.sh --no-prompt  # Non-interactive / CI mode
# =============================================================================

set -euo pipefail

IMAGE_NAME="qmed-backend"
SOURCE_TAG="latest"
SLIM_TAG="slim"
SOURCE_IMAGE="${IMAGE_NAME}:${SOURCE_TAG}"
SLIM_IMAGE="${IMAGE_NAME}:${SLIM_TAG}"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Q-Med Backend — Slim Image Optimization    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Step 1: Check prerequisites ──────────────────────────────────────────────
command -v slim >/dev/null 2>&1 || {
    echo "❌ slim CLI not found."
    echo "   Install: https://github.com/slimtoolkit/slim#installation"
    echo "   Quick:   curl -sL https://raw.githubusercontent.com/slimtoolkit/slim/master/scripts/install-slim.sh | sudo -E bash -"
    exit 1
}

command -v docker >/dev/null 2>&1 || { echo "❌ docker not found."; exit 1; }

# ── Step 2: Check source image exists ─────────────────────────────────────────
if ! docker image inspect "${SOURCE_IMAGE}" >/dev/null 2>&1; then
    echo "⚠️  Source image '${SOURCE_IMAGE}' not found. Building it now..."
    docker compose build backend
fi

# ── Step 3: Show source image size ────────────────────────────────────────────
BEFORE_SIZE=$(docker image inspect "${SOURCE_IMAGE}" --format='{{.Size}}' | \
    awk '{printf "%.1f MB", $1/1024/1024}')
echo "📦 Source image size: ${BEFORE_SIZE}"
echo ""
echo "🔬 Running slim analysis and minification..."
echo "   HTTP probes: GET / | GET /health | GET /docs | POST /auth/login"
echo ""

# ── Step 4: Run slim build ────────────────────────────────────────────────────
slim build \
    --http-probe=true \
    --http-probe-cmd "GET:/" \
    --http-probe-cmd "GET:/health" \
    --http-probe-cmd "GET:/docs" \
    --http-probe-cmd "GET:/openapi.json" \
    --http-probe-cmd "POST:/auth/login" \
    --http-probe-start-wait 15 \
    --http-probe-retry-count 3 \
    --http-probe-retry-wait 5 \
    --continue-after probe \
    --tag "${SLIM_IMAGE}" \
    --show-plogs=false \
    "${SOURCE_IMAGE}"

# ── Step 5: Summary ───────────────────────────────────────────────────────────
echo ""
echo "✅ Slim optimization complete!"
echo ""
echo "📊 Size comparison:"
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" \
    | grep "${IMAGE_NAME}" | head -5
echo ""
echo "🔐 Auto-generated seccomp profile saved at:"
echo "   ~/.slim/state/${IMAGE_NAME}/latest/artifacts/seccomp.json"
echo ""
echo "Next steps:"
echo "  • Test slim image:  docker run --rm -p 8000:8000 ${SLIM_IMAGE}"
echo "  • Update compose:   Change image: to ${SLIM_IMAGE} in docker-compose.yml"
