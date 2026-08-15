# =============================================================================
# slim-build.ps1 — Minify Q-Med backend image using SlimToolkit (Windows)
# =============================================================================
# Requires:
#   - slim CLI: winget install SlimToolkit.slim
#   - Docker Desktop running
#   - qmed-backend:latest already built
#
# Usage: .\slim-build.ps1
# =============================================================================

$ImageName  = "qmed-backend"
$SourceTag  = "latest"
$SlimTag    = "slim"
$SourceImg  = "${ImageName}:${SourceTag}"
$SlimImg    = "${ImageName}:${SlimTag}"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Q-Med Backend — Slim Image Optimization    ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Check slim CLI ────────────────────────────────────────────────────────────
if (-not (Get-Command slim -ErrorAction SilentlyContinue)) {
    Write-Host "❌ slim CLI not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Install with winget:" -ForegroundColor Yellow
    Write-Host "  winget install SlimToolkit.slim" -ForegroundColor White
    Write-Host ""
    Write-Host "Or download from:" -ForegroundColor Yellow
    Write-Host "  https://github.com/slimtoolkit/slim/releases" -ForegroundColor White
    exit 1
}

# ── Check source image ────────────────────────────────────────────────────────
$imgExists = docker image inspect $SourceImg 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Source image '$SourceImg' not found. Building..." -ForegroundColor Yellow
    docker compose build backend
    if ($LASTEXITCODE -ne 0) { Write-Host "❌ Build failed." -ForegroundColor Red; exit 1 }
}

# ── Size before ───────────────────────────────────────────────────────────────
$beforeSize = docker image inspect $SourceImg --format='{{.Size}}' 2>$null
$beforeMB   = [math]::Round([long]$beforeSize / 1MB, 1)
Write-Host "📦 Source image size: ${beforeMB} MB" -ForegroundColor White
Write-Host ""
Write-Host "🔬 Running slim analysis..." -ForegroundColor Yellow
Write-Host "   HTTP probes: GET / | GET /health | GET /docs | POST /auth/login" -ForegroundColor Gray
Write-Host ""

# ── Run slim ──────────────────────────────────────────────────────────────────
slim build `
    --http-probe=true `
    --http-probe-cmd "GET:/" `
    --http-probe-cmd "GET:/health" `
    --http-probe-cmd "GET:/docs" `
    --http-probe-cmd "GET:/openapi.json" `
    --http-probe-cmd "POST:/auth/login" `
    --http-probe-start-wait 15 `
    --http-probe-retry-count 3 `
    --http-probe-retry-wait 5 `
    --continue-after probe `
    --tag $SlimImg `
    $SourceImg

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Slim failed." -ForegroundColor Red
    exit 1
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "✅ Done! Size comparison:" -ForegroundColor Green
docker images --format "table {{.Repository}}:{{.Tag}}`t{{.Size}}" | Select-String $ImageName
Write-Host ""
Write-Host "🔐 Seccomp profile: $env:USERPROFILE\.slim\state\$ImageName\latest\artifacts\seccomp.json" -ForegroundColor Gray
Write-Host ""
Write-Host "Next: docker run --rm -p 8000:8000 $SlimImg" -ForegroundColor Cyan
