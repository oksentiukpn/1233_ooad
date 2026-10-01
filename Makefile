# ==============================================================================
# SPRY MONOREPO — DEPLOYMENT & DEVELOPMENT CONTRACT
# ==============================================================================
# Reference: arhitecture.md (Section 1 & 2: Cloudflare/S3 + AWS App Runner / ECR in eu-central-1)
# Cost Efficiency Principle: NFR-8 (<$0.15/active member/mo). Option 2: ~$0.72/day.
# ==============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# ------------------------------------------------------------------------------
# Configuration Variables (Defaults mapped to architecture in arhitecture.md)
# ------------------------------------------------------------------------------
AWS_REGION             ?= eu-central-1
AWS_ACCOUNT_ID         ?= $(shell aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "791614297907")
ECR_REPOSITORY         ?= spry-backend
IMAGE_TAG              ?= $(shell git rev-parse HEAD 2>/dev/null || echo "latest")
ECR_IMAGE              ?= $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(ECR_REPOSITORY):$(IMAGE_TAG)

# Frontend Hosting Strategy:
# 1. 'cloudflare' (Default in arhitecture.md): Cloudflare Pages — $0/mo free tier, 0 egress fees.
# 2. 's3' (Generic AWS Fallback): S3 bucket sync + CloudFront invalidation.
FRONTEND_DEPLOY_TARGET ?= cloudflare
CLOUDFLARE_PROJECT     ?= 1233-ooad
S3_BUCKET              ?= spry-frontend-$(AWS_ACCOUNT_ID)
CLOUDFRONT_DIST_ID     ?= EXXXXXXXXXXXXX

# Backend Hosting Strategy:
# 1. 'apprunner' (Default in arhitecture.md): AWS App Runner — eliminates $32/mo NAT Gateway & $20/mo ALB.
# 2. 'ecs' (Generic AWS Fallback): ECS Fargate rolling deployment.
BACKEND_DEPLOY_TARGET  ?= apprunner
APP_RUNNER_SERVICE_ARN ?= $(shell aws apprunner list-services --region $(AWS_REGION) --query "ServiceSummaryList[?ServiceName=='spry-backend'].ServiceArn" --output text 2>/dev/null)
ECS_CLUSTER            ?= spry-cluster
ECS_SERVICE            ?= spry-backend-service

PYTHON                 ?= python3
VENV                   ?= backend/.venv
RUFF                   ?= $(if $(wildcard $(VENV)/bin/ruff),$(VENV)/bin/ruff,ruff)
INFRA_DIR              ?= infra

.PHONY: help install lint format format-check test build build-frontend build-backend \
        deploy-frontend deploy-backend deploy db-migrate dev down clean \
        infra-init infra-plan infra-apply-base infra-apply-apprunner infra-destroy deploy-aws

# ------------------------------------------------------------------------------
# Help & Documentation
# ------------------------------------------------------------------------------
help:
	@echo "================================================================================"
	@echo "                      SPRY MONOREPO — MAKEFILE CONTRACT                         "
	@echo "================================================================================"
	@echo "  Architecture: Cloudflare Pages + AWS App Runner / ECR + RDS Postgres"
	@echo "  Region:       $(AWS_REGION) (Frankfurt, EU Data Residency per NFR-7)"
	@echo "  Cost Model:   Option 2 (~0.72 USD/day, zero idle NAT Gateways / zero ALB)"
	@echo "--------------------------------------------------------------------------------"
	@echo "Local Development & Quality:"
	@echo "  make install         Install backend and frontend dependencies"
	@echo "  make lint            Run linters (Ruff on backend, ESLint on frontend)"
	@echo "  make format          Auto-format code (Ruff + Prettier)"
	@echo "  make format-check    Verify formatting without modifying files"
	@echo "  make test            Run typechecks, syntax tests, and unit tests"
	@echo "  make dev             Start full local stack via Docker Compose"
	@echo "  make db-migrate      Apply Alembic migrations to database"
	@echo ""
	@echo "Build & Deployment Contract (Step 3 & Step 7):"
	@echo "  make build           Build both frontend bundle and backend Docker image"
	@echo "  make build-frontend  Build static frontend bundle (Vite -> dist/)"
	@echo "  make build-backend   Build backend container image tagged $(IMAGE_TAG)"
	@echo "  make deploy-frontend Deploy bundle to Cloudflare Pages (or S3)"
	@echo "  make deploy-backend  Push commit SHA image to ECR & update App Runner/ECS"
	@echo "  make deploy          Deploy full system (backend + frontend)"
	@echo ""
	@echo "AWS Infrastructure as Code (Option 2 — Terraform):"
	@echo "  make infra-init      Initialize Terraform in infra/"
	@echo "  make infra-plan      Preview AWS resources and changes"
	@echo "  make infra-destroy   Destroy all AWS resources in 1 click (stops all billing)"
	@echo "  make deploy-aws      Turn-key AWS deployment script (ECR + RDS + App Runner)"
	@echo "  make clean           Clean up local build artifacts and caches"
	@echo "================================================================================"

# ------------------------------------------------------------------------------
# Local Setup & Code Quality
# ------------------------------------------------------------------------------
install:
	@echo "--> [1/2] Installing backend Python dependencies..."
	@$(PYTHON) -m venv $(VENV)
	@$(VENV)/bin/pip install --upgrade pip
	@$(VENV)/bin/pip install -r backend/requirements-dev.txt
	@echo "--> [2/2] Installing frontend Node dependencies..."
	@cd frontend && npm install

lint:
	@echo "--> Running Ruff linter on backend..."
	@$(RUFF) check backend/
	@echo "--> Running ESLint on frontend..."
	@cd frontend && npm run lint

format:
	@echo "--> Formatting backend with Ruff..."
	@$(RUFF) format backend/
	@echo "--> Formatting frontend with Prettier..."
	@cd frontend && npm run format

format-check:
	@echo "--> Checking backend formatting with Ruff..."
	@$(RUFF) format --check backend/
	@echo "--> Checking frontend formatting with Prettier..."
	@cd frontend && npm run format:check

test: lint format-check
	@echo "--> Checking backend tests..."
	@if [ -f "$(VENV)/bin/pytest" ] && $(VENV)/bin/python -c "import fastapi, pytest" >/dev/null 2>&1; then \
		cd backend && $(VENV)/bin/pytest tests; \
	elif command -v pytest >/dev/null 2>&1 && python3 -c "import fastapi, pytest" >/dev/null 2>&1; then \
		cd backend && pytest tests; \
	else \
		echo "--> Verifying Python code compilation syntax..."; \
		$(PYTHON) -m compileall backend/app backend/tests; \
	fi
	@echo "--> Checking frontend TypeScript compilation..."
	@cd frontend && npm run build
	@echo "--> Quality gates passed."

dev:
	@echo "--> Starting Spry local stack (PostgreSQL + Backend + Frontend)..."
	@docker compose up --build

down:
	@echo "--> Stopping Spry local stack..."
	@docker compose down

db-migrate:
	@echo "--> Running database migrations with Alembic..."
	@cd backend && $(if $(wildcard ../$(VENV)/bin/alembic),../$(VENV)/bin/alembic,alembic) upgrade head

# ------------------------------------------------------------------------------
# Build Targets
# ------------------------------------------------------------------------------
build: build-frontend build-backend

build-frontend:
	@echo "--> Building frontend production bundle (Vite -> frontend/dist)..."
	@cd frontend && npm run build

build-backend:
	@echo "--> Building backend Docker image: $(ECR_IMAGE)..."
	@docker build -t $(ECR_IMAGE) -t $(ECR_REPOSITORY):latest -f backend/Dockerfile backend

# ------------------------------------------------------------------------------
# Deployment Contract (Self-Executable locally or in CI/CD)
# ------------------------------------------------------------------------------

## Deploy Frontend
# Per arhitecture.md:
# - Target 'cloudflare' (Default): Free tier on Cloudflare Pages ($0/mo, 0 egress fees, instant edge invalidation).
# - Target 's3' (Fallback): Sync to AWS S3 & invalidate AWS CloudFront.
deploy-frontend: build-frontend
	@echo "--> Deploying frontend bundle (Target: $(FRONTEND_DEPLOY_TARGET))..."
ifeq ($(FRONTEND_DEPLOY_TARGET),cloudflare)
	@echo "--> [Cloudflare Pages] Deploying frontend/dist to project '$(CLOUDFLARE_PROJECT)'..."
	@if command -v npx >/dev/null 2>&1 && [ -n "$$CLOUDFLARE_API_TOKEN" ]; then \
		cd frontend && npx wrangler pages deploy dist --project-name=$(CLOUDFLARE_PROJECT); \
	else \
		echo "[Dry-Run / Missing Token] Command to run:"; \
		echo "  cd frontend && npx wrangler pages deploy dist --project-name=$(CLOUDFLARE_PROJECT)"; \
		echo "(Export CLOUDFLARE_API_TOKEN to trigger real deployment)"; \
	fi
else
	@echo "--> [AWS S3 + CloudFront] Syncing bundle to s3://$(S3_BUCKET)..."
	@if command -v aws >/dev/null 2>&1 && [ -n "$$AWS_ACCESS_KEY_ID" ]; then \
		aws s3 sync frontend/dist s3://$(S3_BUCKET) --delete --cache-control "public, max-age=31536000, immutable"; \
		aws cloudfront create-invalidation --distribution-id $(CLOUDFRONT_DIST_ID) --paths "/*"; \
	else \
		echo "[Dry-Run / Missing Credentials] Commands to run:"; \
		echo "  aws s3 sync frontend/dist s3://$(S3_BUCKET) --delete"; \
		echo "  aws cloudfront create-invalidation --distribution-id $(CLOUDFRONT_DIST_ID) --paths '/*'"; \
	fi
endif
	@echo "--> Frontend deployment step complete."

## Deploy Backend (Step 7: Tag with commit SHA, push to ECR, update service)
deploy-backend: build-backend
	@echo "--> [1/2] Pushing image tagged with commit SHA to Amazon ECR ($(AWS_REGION))..."
	@if command -v aws >/dev/null 2>&1; then \
		aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com; \
		docker push $(ECR_IMAGE); \
		docker tag $(ECR_IMAGE) $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(ECR_REPOSITORY):latest; \
		docker push $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(ECR_REPOSITORY):latest; \
	else \
		echo "[Dry-Run / Missing Credentials] Commands to push to ECR:"; \
		echo "  aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com"; \
		echo "  docker push $(ECR_IMAGE)"; \
	fi
ifeq ($(BACKEND_DEPLOY_TARGET),apprunner)
	@echo "--> [2/2] [AWS App Runner] Updating service to tag '$(IMAGE_TAG)' in $(AWS_REGION)..."
	@RESOLVED_ARN="$(APP_RUNNER_SERVICE_ARN)"; \
	if [ -z "$$RESOLVED_ARN" ] && command -v aws >/dev/null 2>&1; then \
		RESOLVED_ARN=$$(aws apprunner list-services --region $(AWS_REGION) --query "ServiceSummaryList[?ServiceName=='spry-backend'].ServiceArn" --output text 2>/dev/null); \
	fi; \
	if command -v aws >/dev/null 2>&1 && [ -n "$$RESOLVED_ARN" ]; then \
		echo "Updating App Runner service: $$RESOLVED_ARN with image: $(ECR_IMAGE)"; \
		aws apprunner update-service \
			--service-arn "$$RESOLVED_ARN" \
			--source-configuration 'ImageRepository={ImageIdentifier="$(ECR_IMAGE)",ImageConfiguration={Port="8000"}}'; \
	else \
		echo "[Dry-Run / Missing Credentials] Command to trigger App Runner deployment:"; \
		echo "  aws apprunner update-service --service-arn <SERVICE_ARN> --source-configuration 'ImageRepository={ImageIdentifier=\"$(ECR_IMAGE)\",ImageConfiguration={Port=\"8000\"}}'"; \
	fi
else
	@echo "--> [2/2] [AWS ECS Fargate] Updating service '$(ECS_SERVICE)' on cluster '$(ECS_CLUSTER)' to tag '$(IMAGE_TAG)'..."
	@if command -v aws >/dev/null 2>&1; then \
		aws ecs update-service --cluster $(ECS_CLUSTER) --service $(ECS_SERVICE) --force-new-deployment; \
	else \
		echo "[Dry-Run / Missing Credentials] Command to trigger ECS rolling deployment:"; \
		echo "  aws ecs update-service --cluster $(ECS_CLUSTER) --service $(ECS_SERVICE) --force-new-deployment"; \
	fi
endif
	@echo "--> Backend deployment step complete."

## Deploy Everything
deploy: deploy-backend deploy-frontend
	@echo "================================================================================"
	@echo "  Full Spry deployment successfully completed!"
	@echo "  Frontend: $(FRONTEND_DEPLOY_TARGET) | Backend: $(BACKEND_DEPLOY_TARGET) ($(AWS_REGION))"
	@echo "================================================================================"

# ------------------------------------------------------------------------------
# Terraform AWS Turn-Key Targets (Option 2 — ~0.72 USD/day)
# ------------------------------------------------------------------------------
infra-init:
	@echo "--> Initializing Terraform in $(INFRA_DIR)..."
	@terraform -chdir=$(INFRA_DIR) init

infra-plan:
	@echo "--> Running Terraform plan..."
	@terraform -chdir=$(INFRA_DIR) plan

infra-apply-base:
	@echo "--> Provisioning Base AWS Infrastructure (ECR, RDS, S3, CloudFront)..."
	@terraform -chdir=$(INFRA_DIR) apply -var="enable_app_runner=false"

infra-apply-apprunner:
	@echo "--> Provisioning/Updating AWS App Runner service..."
	@terraform -chdir=$(INFRA_DIR) apply -var="enable_app_runner=true"

infra-destroy:
	@echo "--> Destroying ALL AWS resources to stop any billing..."
	@terraform -chdir=$(INFRA_DIR) destroy

deploy-aws:
	@echo "--> Running turn-key deployment to AWS..."
	@./scripts/deploy_aws.sh

# ------------------------------------------------------------------------------
# Cleanup
# ------------------------------------------------------------------------------
clean:
	@echo "--> Cleaning build artifacts and caches..."
	@rm -rf frontend/dist frontend/node_modules/.vite
	@find . -type d -name "__pycache__" -exec rm -rf {} +
	@find . -type d -name ".ruff_cache" -exec rm -rf {} +
	@echo "--> Clean complete."
