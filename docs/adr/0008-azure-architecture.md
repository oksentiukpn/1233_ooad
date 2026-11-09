# 8. Multicloud Architecture: Moving Spry's Core to Microsoft Azure

Date: 2026-11-09

## Status

Accepted

## Context

By Lab 7, Spry’s production workload ran entirely on AWS, defined and deployed via Terraform (`infra/`):

- Frontend served statically via Amazon S3, CloudFront and Cloudflare Pages.
- Backend FastAPI application packaged in a container and executed on AWS Lambda with Function URLs.
- Database hosted on Amazon Aurora Serverless v2 PostgreSQL (scaling down and pausing when idle).
- Secrets managed in AWS Secrets Manager / SSM Parameter Store.
- Notifications and AI features wired to AWS Bedrock, SES, and EventBridge.

This architectural decision addresses the multicloud portability requirement (Lab 9): evaluating what it takes to run Spry's core on **Microsoft Azure** (adapted from Google Cloud Platform per course instructor approval), choosing the optimal Azure service counterpart for each piece of Spry, detailing how the architecture scales and costs under different load profiles, and outlining operational tradeoffs.

## Decision Drivers

1. **Serverless & Scale-to-Zero Compute**: The backend container must run on a fully managed serverless platform that scales to zero instances when idle to eliminate unnecessary charges.
2. **PostgreSQL Compatibility**: Spry's data model utilizes PostgreSQL (Alembic migrations, SQLAlchemy ORM). The database must be fully compatible with PostgreSQL with minimal operational overhead.
3. **Frontend Simplicity**: Keep the existing lightweight frontend delivery on Cloudflare Pages (with native HTTPS, zero cost, and global CDN caching) while enabling direct or proxied communication with the Azure API.
4. **Credential Security**: Eliminate long-lived service account keys by utilizing Microsoft Entra ID (Azure AD) Workload Identity Federation / Azure CLI Application Default Credentials and Azure Key Vault for secrets.
5. **Cost Predictability**: Minimize fixed monthly infrastructure charges for student/sandbox workloads.

## Service Mapping & Architecture Decisions

| Spry on AWS                                            | Counterpart on Google Cloud              | Choice on Microsoft Azure                                           | Decision & Architectural Rationale                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend CDN** (S3 + CloudFront / Cloudflare)        | Firebase Hosting                         | **Cloudflare Pages** (with Azure Static Web Apps documented)        | **Keep Cloudflare Pages**: Free global CDN, built-in HTTPS, instant Git push deployments, and zero egress cost. Azure Static Web Apps is configured in Terraform as an optional pure-Azure alternative.                                                                                                                         |
| **Backend API** (Lambda + Function URL)                | Cloud Run                                | **Azure Container Apps (Consumption Plan)**                         | **Replace with Azure Container Apps**: Powered by KEDA and Envoy on managed serverless infrastructure. Provides automatic HTTPS endpoints, zero-maintenance scaling, and scales to **0 replicas** on idle. Free monthly allowance includes 2M requests, 180,000 vCPU-seconds, and 360,000 GiB-seconds.                          |
| **Container Registry** (Amazon ECR)                    | Artifact Registry                        | **Azure Container Registry (ACR) / Docker Hub**                     | **Replace with ACR (Basic Tier)**: Secure private OCI-compliant registry in the same Azure region, minimizing network latency and deployment times to Container Apps.                                                                                                                                                           |
| **Relational Database** (Aurora Serverless v2)         | Cloud SQL for PostgreSQL (`db-f1-micro`) | **Azure Database for PostgreSQL Flexible Server (`Standard_B1ms`)** | **Replace with PostgreSQL Flexible Server**: Burstable tier `B1ms` (1 vCPU, 2 GiB RAM, 32 GiB storage) provides full PostgreSQL 16 compatibility. While it does not pause automatically on idle like Aurora Serverless v2, it supports programmatic start/stop via CLI or automation schedules to prevent idle compute billing. |
| **NoSQL Database** (DynamoDB)                          | Firestore                                | **Azure Cosmos DB (Serverless / Free Tier)**                        | **Evaluated Alternative**: 1,000 RU/s and 25 GB free forever. Eliminates relational joins and requires rewriting SQLAlchemy models into document stores, making it optimal for $0 idle cost if relational SQL is abandoned.                                                                                                     |
| **Secrets Management** (Secrets Manager)               | Secret Manager                           | **Azure Key Vault**                                                 | **Replace with Azure Key Vault**: Secure secret store for database credentials and API keys. Natively mounts into Azure Container Apps via Managed Identity without hardcoding credentials in code.                                                                                                                             |
| **Authentication** (Cognito User Pool)                 | Identity Platform (Firebase Auth)        | **Microsoft Entra External ID** / Retain Cognito JWT verification   | **Hybrid / Retain JWT verification**: Spry’s FastAPI backend validates standard OIDC JWT signatures. The backend can accept tokens from Cognito or Entra ID without rearchitecting the database user schema.                                                                                                                    |
| **AI / Agenda Parsing** (Bedrock - Claude / Ministral) | Vertex AI (Gemini)                       | **Azure OpenAI Service / Azure AI Foundry**                         | **Replace with Azure AI Foundry / OpenAI**: Uses GPT-4o-mini or Phi-4 models with comparable low latency and token-based pricing.                                                                                                                                                                                               |
| **Email Notifications** (Amazon SES / Resend)          | SendGrid / Mailgun                       | **Azure Communication Services (Email) or Resend**                  | **Keep Resend / ACS**: Resend API remains cloud-agnostic; Azure Communication Services provides native Azure-based SMTP/REST email delivery.                                                                                                                                                                                    |
| **Observability** (CloudWatch Logs)                    | Cloud Logging                            | **Azure Monitor & Log Analytics**                                   | **Replace with Log Analytics Workspace**: Centralized container log ingestion and real-time query analytics.                                                                                                                                                                                                                    |

## Addressing the Core Architectural Questions

### 1. The Database: Flexible Server vs. Stopped Instance vs. Cosmos DB vs. Cross-Cloud

- **Azure Database for PostgreSQL (24/7 Running)**:
  - _Latency_: Lowest (~1–2 ms inside the same Azure region / virtual network).
  - _Bill_: ~$12.50/month compute (`B1ms`) + ~$3.68/month (32 GB SSD storage) = ~$16.18/month.
  - _Code_: Zero code changes. Existing Alembic migrations and SQLAlchemy models run without modification.
- **Azure Database for PostgreSQL (Stopped when idle / at night)**:
  - _Latency_: ~60–90 seconds cold start when started via script/CLI, then ~1–2 ms.
  - _Bill_: Compute cost drops to $0 during stopped hours; only storage is billed ($3.68/month).
  - _Code_: Zero changes to application logic; requires an automation schedule (e.g. Azure Logic Apps or CLI script).
- **Azure Cosmos DB (Serverless / Free Tier)**:
  - _Latency_: Single-digit millisecond document lookups.
  - _Bill_: **$0.00/month** (fits entirely within the 1,000 RU/s + 25 GB lifetime free tier).
  - _Code_: High rewriting cost. Removes SQL joins, foreign key constraints, and requires re-architecting relational schemas into document collections.
- **Cross-Cloud to AWS Aurora Serverless v2**:
  - _Latency_: High and variable (40–80 ms per query across public Internet / AWS-to-Azure peering). Multi-query HTTP requests will experience significant slowdown.
  - _Bill_: Egress bandwidth charges from AWS (~$0.09/GB) and potential security exposure requiring complex VPN / site-to-site tunnels.
  - _Conclusion_: A dedicated PostgreSQL Flexible Server in Azure is the cleanest architecture for this lab, stopped after validation to eliminate ongoing compute charges.

### 2. Email Provider and API Key Management

- **Provider**: **Resend** (or Azure Communication Services).
- **Key Storage**: Stored securely in **Azure Key Vault** as secret `resend-api-key`. It is injected directly into the Azure Container App environment as an environment variable via Managed Identity, completely eliminating plaintext credentials in source control.

### 3. Which of Spry's features would NOT be moved immediately, and why?

1. **Authentication User Store (Amazon Cognito)**:
   - Moving active user identities requires exporting user password hashes, which Cognito does not allow for security reasons (users would need to reset passwords). Keeping Cognito or using external Google OAuth with JWT verification avoids migrating user accounts.
2. **Weekly Scheduled Email Reports (EventBridge Scheduler)**:
   - Keeping the scheduler on AWS or using a simple Azure Logic App HTTP trigger avoids deploying complex background worker fleets during initial migration.
3. **Frontend Hosting (Cloudflare Pages)**:
   - Cloudflare Pages is cloud-agnostic, has superior DDoS mitigation, free custom domains, and zero bandwidth egress fees. Keeping frontend on Cloudflare while pointing API requests to Azure Container Apps provides an optimal multicloud developer experience.

## Consequences

### Positive

- Spry gains full multi-cloud operational capability: the backend container can run identically on AWS Lambda or Azure Container Apps.
- Cost scales to $0 on idle for compute via Azure Container Apps (`min_replicas = 0`).
- Strict security: no static service account keys or passwords stored in the repository.

### Negative / Tradeoffs

- PostgreSQL on Azure does not automatically pause compute on idle like Aurora Serverless v2; manual or scheduled stop is required to avoid ongoing compute billing.
- Additional operational surface: managing infrastructure definitions across both `infra/` (AWS) and `azure/` (Azure).
