#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# SPRY — Automated AWS Turn-Key Deployment Script (Option 2)
# ==============================================================================
# Architecture: Cloudflare/S3+CloudFront + AWS App Runner + RDS PostgreSQL 16
# Region: us-east-1 (N. Virginia)
# Estimated Cost: ~$0.72/day (~$21.50/month)
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INFRA_DIR="${PROJECT_ROOT}/infra"
AWS_REGION="us-east-1"

echo "================================================================================"
echo "          SPRY — AWS TURN-KEY DEPLOYMENT (OPTION 2: ~0.72 USD/DAY)              "
echo "================================================================================"

# Step 1: Verify prerequisites
echo "--> [1/6] Checking tools and AWS credentials..."
command -v aws >/dev/null 2>&1 || { echo "ERROR: aws CLI is required."; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "ERROR: terraform is required."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "ERROR: docker is required."; exit 1; }

CALLER_IDENTITY=$(aws sts get-caller-identity --output json)
ACCOUNT_ID=$(echo "${CALLER_IDENTITY}" | grep -o '"Account": "[^"]*' | cut -d'"' -f4)
echo "    AWS Account: ${ACCOUNT_ID}"
echo "    AWS Region:  ${AWS_REGION}"

# Step 2: Provision Base Infrastructure (ECR, RDS, S3, CloudFront)
echo "--> [2/6] Provisioning Base AWS Infrastructure (ECR, RDS, S3, CloudFront)..."
terraform -chdir="${INFRA_DIR}" init
terraform -chdir="${INFRA_DIR}" apply -auto-approve -var="enable_app_runner=false"

ECR_REPO_URL=$(terraform -chdir="${INFRA_DIR}" output -raw ecr_repository_url)
RDS_ENDPOINT=$(terraform -chdir="${INFRA_DIR}" output -raw rds_endpoint)
S3_BUCKET=$(terraform -chdir="${INFRA_DIR}" output -raw frontend_s3_bucket)
DATABASE_URL=$(terraform -chdir="${INFRA_DIR}" output -raw database_url)

echo "    ECR URL:      ${ECR_REPO_URL}"
echo "    RDS Endpoint: ${RDS_ENDPOINT}"
echo "    S3 Bucket:    ${S3_BUCKET}"

# Step 3: Build & Push Backend Docker Image to ECR
echo "--> [3/6] Building and pushing Docker container to ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
docker build -t "${ECR_REPO_URL}:latest" -t "spry-backend:latest" -f "${PROJECT_ROOT}/backend/Dockerfile" "${PROJECT_ROOT}/backend"
docker push "${ECR_REPO_URL}:latest"

# Step 4: Run Database Migrations on RDS via Docker Container (isolated environment)
echo "--> [4/6] Running Alembic database migrations against RDS..."
docker run --rm -e DATABASE_URL="${DATABASE_URL}" "${ECR_REPO_URL}:latest" alembic upgrade head

# Step 5: Provision/Update AWS App Runner Service
echo "--> [5/6] Provisioning AWS App Runner Service..."
terraform -chdir="${INFRA_DIR}" apply -auto-approve -var="enable_app_runner=true"

APPRUNNER_URL=$(terraform -chdir="${INFRA_DIR}" output -raw apprunner_service_url)
echo "    App Runner Public API: ${APPRUNNER_URL}"

# Step 6: Build & Deploy Frontend (pointing to live App Runner API)
echo "--> [6/6] Building and uploading frontend to S3..."
export VITE_API_URL="${APPRUNNER_URL}"
(
  cd "${PROJECT_ROOT}/frontend"
  npm run build
  aws s3 sync dist "s3://${S3_BUCKET}" --delete --cache-control "public, max-age=31536000, immutable"
)

CLOUDFRONT_URL=$(terraform -chdir="${INFRA_DIR}" output -raw cloudfront_domain_name || echo "N/A")

echo "================================================================================"
echo "                      DEPLOYMENT COMPLETED SUCCESSFULLY!                        "
echo "================================================================================"
echo "  Frontend URL (CloudFront HTTPS): ${CLOUDFRONT_URL}"
echo "  Backend API (App Runner HTTPS):   ${APPRUNNER_URL}"
echo "  PostgreSQL RDS Host:              ${RDS_ENDPOINT}"
echo "--------------------------------------------------------------------------------"
echo "  To completely teardown and stop all charges, run:"
echo "    make infra-destroy"
echo "================================================================================"
