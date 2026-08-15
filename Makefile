# =============================================================================
# Q-Med Makefile — Docker management shortcuts
# =============================================================================

.DEFAULT_GOAL := help
COMPOSE        = docker compose

.PHONY: help build dev prod down logs ps clean slim shell db-shell

# ── Help ──────────────────────────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ── Build ─────────────────────────────────────────────────────────────────────
build: ## Build production Docker image
	$(COMPOSE) build backend

build-nocache: ## Build without Docker layer cache
	$(COMPOSE) build --no-cache backend

# ── Start / stop ──────────────────────────────────────────────────────────────
dev: ## Start development environment (hot reload)
	$(COMPOSE) up

dev-bg: ## Start development environment in background
	$(COMPOSE) up -d

prod: ## Start production environment
	$(COMPOSE) up -d

down: ## Stop all services
	$(COMPOSE) down

# ── Monitoring ────────────────────────────────────────────────────────────────
logs: ## Follow logs (all services)
	$(COMPOSE) logs -f

logs-backend: ## Follow backend logs only
	$(COMPOSE) logs -f backend

ps: ## Show running services
	$(COMPOSE) ps

# ── Shell access ──────────────────────────────────────────────────────────────
shell: ## Open shell in backend container
	$(COMPOSE) exec backend bash

db-shell: ## Open PostgreSQL interactive shell
	$(COMPOSE) exec db psql -U $${POSTGRES_USER:-qmed_user} -d $${POSTGRES_DB:-qmed_db}

# ── Slim optimization ─────────────────────────────────────────────────────────
slim: build ## Build then minify with SlimToolkit
	@bash slim-build.sh

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean: ## Stop services and remove volumes (⚠️ deletes DB data)
	$(COMPOSE) down -v --remove-orphans

prune: ## Remove all unused Docker images/containers/volumes
	docker system prune -f

# ── Health check ──────────────────────────────────────────────────────────────
health: ## Check backend health endpoint
	@curl -s http://localhost:8000/health | python -m json.tool || echo "❌ Backend not running"
