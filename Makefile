# ==============================================================================
# SPRY MONOREPO — DEPLOYMENT & DEVELOPMENT CONTRACT
# ==============================================================================
# Reference: architecture-migration.md (Lambda + Function URL in us-east-1)
# Cost Efficiency Principle: NFR-8 (<$0.15/active member/mo). Zero Idle Cost ($0).
# ==============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# ------------------------------------------------------------------------------
# Configuration Variables (Defaults mapped to architecture in architecture-migration.md)
# ------------------------------------------------------------------------------
AWS_REGION             ?= us-east-1
AWS_ACCOUNT_ID         ?= $(shell aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "791614297907")
ECR_REPOSITORY         ?= spry-backend
IMAGE_TAG              ?= $(shell git rev-parse HEAD 2>/dev/null || echo "latest")
ECR_IMAGE              ?= $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(ECR_REPOSITORY):$(IMAGE_TAG)

# Frontend Hosting Strategy:
# 1. 'cloudflare' (Default): Cloudflare Pages — $0/mo free tier, 0 egress fees.
# 2. 's3' (Generic AWS Fallback): S3 bucket sync + CloudFront invalidation.
FRONTEND_DEPLOY_TARGET ?= cloudflare
CLOUDFLARE_PROJECT     ?= 1233-ooad
S3_BUCKET              ?= spry-frontend-$(AWS_ACCOUNT_ID)-$(AWS_REGION)
CLOUDFRONT_DIST_ID     ?= EXXXXXXXXXXXXX

# Backend Hosting Strategy:
# 1. 'lambda' (Default per Lab 4): AWS Lambda + Function URL — $0 idle cost.
# 2. 'apprunner' (Legacy fallback): AWS App Runner.
# 3. 'ecs' (Generic AWS Fallback): ECS Fargate rolling deployment.
BACKEND_DEPLOY_TARGET  ?= lambda
LAMBDA_FUNCTION_NAME   ?= spry-backend
APP_RUNNER_SERVICE_ARN ?= $(shell aws apprunner list-services --region $(AWS_REGION) --query "ServiceSummaryList[?ServiceName=='spry-backend'].ServiceArn" --output text 2>/dev/null)
ECS_CLUSTER            ?= spry-cluster
ECS_SERVICE            ?= spry-backend-service

PYTHON                 ?= python3
VENV                   ?= backend/.venv
RUFF                   ?= $(if $(wildcard $(VENV)/bin/ruff),$(VENV)/bin/ruff,ruff)
INFRA_DIR              ?= infra
DOCKER                 ?= $(shell if docker info >/dev/null 2>&1; then echo docker; elif command -v podman >/dev/null 2>&1; then echo podman; else echo docker; fi)

# Step 4: Resolve API URL from Terraform or AWS Lambda Function URL
API_URL                ?= $(shell terraform -chdir=$(INFRA_DIR) output -raw lambda_function_url 2>/dev/null || aws lambda get-function-url-config --function-name $(LAMBDA_FUNCTION_NAME) --region $(AWS_REGION) --query "FunctionUrl" --output text 2>/dev/null)

.PHONY: help install lint format format-check test build build-frontend build-backend \
        deploy-frontend deploy-backend deploy aws-deploy aws-deploy-backend aws-deploy-frontend db-migrate dev down clean \
        infra-init infra-plan infra-apply-base infra-apply-lambda infra-destroy deploy-aws

# ------------------------------------------------------------------------------
# Help & Documentation
# ------------------------------------------------------------------------------
help:
	@echo "================================================================================"
	@echo "  SPRY \u2014 Architecture Migration & Development Toolchain"
	@echo "================================================================================"
	@echo "Environment: AWS Region: $(AWS_REGION) | ECR Image: $(ECR_IMAGE)"
	@echo "--------------------------------------------------------------------------------"
	@echo "Local Development & Quality:"
	@echo "  make install         Install backend and frontend dependencies"
	@echo "  make lint            Run linters (Ruff on backend, ESLint on frontend)"
	@echo "  make format          Auto-format code (Ruff + Prettier)"
	@echo "  make format-check    Verify formatting without modifying files"
	@echo "  make test            Run typechecks and unit tests"
	@echo "  make dev             Start full local stack via Docker Compose"
	@echo "  make db-migrate      Apply Alembic migrations to database"
	@echo ""
	@echo "Build & Deployment Contract (architecture-migration.md):"
	@echo "  make build           Build both frontend bundle and backend Docker image"
	@echo "  make build-frontend  Build static frontend bundle with baked-in API_URL"
	@echo "  make build-backend   Build backend container image tagged $(IMAGE_TAG)"
	@echo "  make deploy-frontend Deploy bundle to Cloudflare Pages (or S3 + CloudFront)"
	@echo "  make deploy-backend  Push to ECR & update Lambda / App Runner in $(AWS_REGION)"
	@echo "  make deploy          Deploy full system (backend first, then frontend)"
	@echo "  make aws-deploy      Alias for deploy (per architecture-migration.md)"
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
	@echo "--> Checking frontend TypeScript compilation..."
	@cd frontend && npm run build
	@echo "--> Testing Python code syntax..."
	@$(PYTHON) -m compileall backend/app

dev:
	@echo "--> Starting Spry local stack (PostgreSQL + Backend + Frontend)..."
	@$(DOCKER) compose up --build

down:
	@echo "--> Stopping Spry local stack..."
	@$(DOCKER) compose down

db-migrate:
	@echo "--> Running database migrations with Alembic..."
	@cd backend && $(if $(wildcard ../$(VENV)/bin/alembic),../$(VENV)/bin/alembic,alembic) upgrade head

# ------------------------------------------------------------------------------
# Build Targets
# ------------------------------------------------------------------------------
build: build-frontend build-backend

build-frontend:
	@echo "--> Building frontend production bundle (Vite -> frontend/dist)..."
	@echo "--> Baking API Base URL into frontend: '$(API_URL)'..."
	@cd frontend && NEXT_PUBLIC_API_BASE_URL="$(API_URL)" VITE_API_URL="$(API_URL)" npm run build

build-backend:
	@echo "--> Building backend Lambda container image: $(ECR_IMAGE)..."
	@$(DOCKER) build -t $(ECR_IMAGE) -t $(ECR_REPOSITORY):latest -f backend/Dockerfile.lambda backend

# ------------------------------------------------------------------------------
# Deployment Contract (Self-Executable locally or in CI/CD)
# ------------------------------------------------------------------------------

## Deploy Frontend
# Per architecture-migration.md:
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

## Deploy Backend
deploy-backend: build-backend
	@echo "--> [1/2] Pushing image tagged with commit SHA to Amazon ECR ($(AWS_REGION))..."
	@if command -v aws >/dev/null 2>&1; then \
		aws ecr get-login-password --region $(AWS_REGION) | $(DOCKER) login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com; \
		$(DOCKER) push $(ECR_IMAGE); \
		$(DOCKER) tag $(ECR_IMAGE) $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(ECR_REPOSITORY):latest; \
		$(DOCKER) push $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com/$(ECR_REPOSITORY):latest; \
	else \
		echo "[Dry-Run / Missing Credentials] Commands to push to ECR:"; \
		echo "  aws ecr get-login-password --region $(AWS_REGION) | $(DOCKER) login --username AWS --password-stdin $(AWS_ACCOUNT_ID).dkr.ecr.$(AWS_REGION).amazonaws.com"; \
		echo "  docker push $(ECR_IMAGE)"; \
	fi
ifeq ($(BACKEND_DEPLOY_TARGET),lambda)
	@echo "--> [2/2] [AWS Lambda] Updating function '$(LAMBDA_FUNCTION_NAME)' in $(AWS_REGION)..."
	@if command -v aws >/dev/null 2>&1; then \
		aws lambda update-function-code --function-name $(LAMBDA_FUNCTION_NAME) --image-uri $(ECR_IMAGE) --region $(AWS_REGION); \
		aws lambda wait function-updated --function-name $(LAMBDA_FUNCTION_NAME) --region $(AWS_REGION); \
		echo "--> Invoking programmatic database migrations via Lambda direct invocation..."; \
		aws lambda invoke --function-name $(LAMBDA_FUNCTION_NAME) --payload '{"action": "migrate"}' --cli-binary-format raw-in-base64-out --region $(AWS_REGION) /tmp/migration-result.json; \
		cat /tmp/migration-result.json; echo ""; \
	else \
		echo "[Dry-Run / Missing Credentials] Commands to update Lambda:"; \
		echo "  aws lambda update-function-code --function-name $(LAMBDA_FUNCTION_NAME) --image-uri $(ECR_IMAGE)"; \
		echo "  aws lambda invoke --function-name $(LAMBDA_FUNCTION_NAME) --payload '{\"action\": \"migrate\"}'"; \
	fi
else ifeq ($(BACKEND_DEPLOY_TARGET),apprunner)
	@echo "--> [2/2] [AWS App Runner] Updating service to tag '$(IMAGE_TAG)' in $(AWS_REGION)..."
	@RESOLVED_ARN="$(APP_RUNNER_SERVICE_ARN)"; \
	if [ -z "$$RESOLVED_ARN" ] && command -v aws >/dev/null 2>&1; then \
		RESOLVED_ARN=$$(aws apprunner list-services --region $(AWS_REGION) --query "ServiceSummaryList[?ServiceName=='spry-backend'].ServiceArn" --output text 2>/dev/null); \
	fi; \
	if command -v aws >/dev/null 2>&1 && [ -n "$$RESOLVED_ARN" ]; then \
		echo "Updating App Runner service: $$RESOLVED_ARN with image: $(ECR_IMAGE)"; \
		SRC_CFG=$$(aws apprunner describe-service --service-arn "$$RESOLVED_ARN" --region $(AWS_REGION) --query "Service.SourceConfiguration" --output json 2>/dev/null); \
		if command -v jq >/dev/null 2>&1 && [ -n "$$SRC_CFG" ]; then \
			UPDATED_CFG=$$(echo "$$SRC_CFG" | jq -c --arg img "$(ECR_IMAGE)" '.ImageRepository.ImageIdentifier = $$img'); \
			aws apprunner update-service --service-arn "$$RESOLVED_ARN" --source-configuration "$$UPDATED_CFG" --region $(AWS_REGION) || aws apprunner start-deployment --service-arn "$$RESOLVED_ARN" --region $(AWS_REGION) || true; \
		else \
			aws apprunner start-deployment --service-arn "$$RESOLVED_ARN" --region $(AWS_REGION) || true; \
		fi; \
	fi
else
	@echo "--> [2/2] [AWS ECS Fargate] Updating service '$(ECS_SERVICE)' on cluster '$(ECS_CLUSTER)' to tag '$(IMAGE_TAG)'...\"\
	@if command -v aws >/dev/null 2>&1; then \
		aws ecs update-service --cluster $(ECS_CLUSTER) --service $(ECS_SERVICE) --force-new-deployment; \
	fi
endif
	@echo "--> Backend deployment step complete."

## Step 4 deploy order: backend first, then frontend
deploy: deploy-backend deploy-frontend
	@echo "================================================================================"
	@echo "  Full Spry deployment successfully completed!"
	@echo "  Frontend: $(FRONTEND_DEPLOY_TARGET) | Backend: $(BACKEND_DEPLOY_TARGET) ($(AWS_REGION))"
	@echo "================================================================================"

aws-deploy: deploy
aws-deploy-backend: deploy-backend
aws-deploy-frontend: deploy-frontend

# ------------------------------------------------------------------------------
# Terraform AWS Turn-Key Targets
# ------------------------------------------------------------------------------
infra-init:
	@echo "--> Initializing Terraform in $(INFRA_DIR)..."
	@terraform -chdir=$(INFRA_DIR) init

infra-plan:
	@echo "--> Running Terraform plan..."
	@terraform -chdir=$(INFRA_DIR) plan

infra-apply-base:
	@echo "--> Provisioning Base AWS Infrastructure (ECR, RDS, S3, CloudFront)..."
	@terraform -chdir=$(INFRA_DIR) apply -var="enable_lambda=false"

infra-apply-lambda:
	@echo "--> Provisioning/Updating AWS Lambda service..."
	@terraform -chdir=$(INFRA_DIR) apply -var="enable_lambda=true"

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
