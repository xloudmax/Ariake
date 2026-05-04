# =============================================================================
# Ariake · Makefile — convenience wrappers around docker compose, deploy,
# and codegen. Targets are purposely thin; each one prints what it runs.
# =============================================================================

SHELL := /usr/bin/env bash
DOCKER_COMPOSE := docker compose
COMPOSE_PROD := -f docker-compose.yml -f docker-compose.prod.yml

.PHONY: help dev dev-build dev-logs dev-down dev-reset \
        prod-config prod-up prod-down prod-deploy prod-backup \
        codegen build test lint security-rewrite

help: ## Show this help.
	@awk 'BEGIN{FS=":.*##"; printf "Targets:\n"} /^[a-zA-Z0-9_.-]+:.*##/ {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ----------------------------------------------------------------------- dev
dev: ## Bring up the local stack (PG + backend + ai-service + frontend) detached.
	$(DOCKER_COMPOSE) up -d

dev-build: ## Like `dev` but force-rebuild every image.
	$(DOCKER_COMPOSE) up -d --build

dev-logs: ## Tail logs from every service.
	$(DOCKER_COMPOSE) logs -f --tail=100

dev-down: ## Stop the stack but keep volumes.
	$(DOCKER_COMPOSE) down

dev-reset: ## Stop AND remove volumes — destroys the dev DB. Asks for confirmation.
	@read -p "This will WIPE the local pgdata volume. Continue? [y/N] " ans; \
	  [[ "$$ans" =~ ^[Yy]$$ ]] && $(DOCKER_COMPOSE) down -v || echo "aborted"

# --------------------------------------------------------------------- prod
prod-config: ## Render the merged production compose to stdout (validation).
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) config

prod-up: ## Bring up the production override (assumes nginx serves frontend).
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) up -d

prod-down:
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) down

prod-deploy: ## Run deploy/deploy.sh on the remote host. Requires DEPLOY_HOST=user@host.
	@[ -n "$$DEPLOY_HOST" ] || { echo "ERROR: set DEPLOY_HOST=user@host"; exit 2; }
	@echo "Deploying to $$DEPLOY_HOST ..."
	ssh "$$DEPLOY_HOST" "cd /var/www/blog && sudo deploy/deploy.sh"

prod-backup: ## Run deploy/scripts/backup_db.sh on the remote host.
	@[ -n "$$DEPLOY_HOST" ] || { echo "ERROR: set DEPLOY_HOST=user@host"; exit 2; }
	ssh "$$DEPLOY_HOST" "sudo /var/www/blog/deploy/scripts/backup_db.sh"

# -------------------------------------------------------------------- codegen
codegen: ## Regenerate GraphQL types (frontend + mobile + backend).
	pnpm -C apps/backend generate
	pnpm codegen

# -------------------------------------------------------------------- checks
build: ## turbo build (frontend + backend + ai-service)
	pnpm build

test: ## turbo test
	pnpm test

lint: ## turbo lint
	pnpm lint

# ----------------------------------------------------------------- security
security-rewrite: ## DESTRUCTIVE: purge committed secrets and binaries from git history.
	@echo "About to run scripts/rewrite-history.sh — read it first."
	@bash scripts/rewrite-history.sh
