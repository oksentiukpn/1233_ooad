# ADR 0007: Migration from CloudFormation to Terraform with HCP Terraform

- **Status**: Accepted
- **Date**: 2026-10-28
- **Authors**: Spry Architecture Team

## 1. Context and Problem Statement
In Labs 4, 5, and 6, Spry infrastructure was provisioned across three separate AWS CloudFormation templates:
- `infra/auth.yml` (Cognito User Pool, Google IdP, OAuth Client, Hosted UI)
- `infra/reports.yml` (EventBridge Scheduler, SQS Queues, Report Builder Lambda, S3 Bucket, Mailer Lambda)
- `infra/ai.yml` (Agenda Parser Lambda, IAM roles for Amazon Bedrock, Function URL, Cost Budget)

While these templates worked within the AWS ecosystem, managing infrastructure via isolated CloudFormation stacks introduced fundamental architectural friction:
1. **Multi-Provider & Ecosystem Boundaries**: CloudFormation is strictly limited to AWS APIs. Spry's operational footprint spans multiple external systems (GitHub Actions OIDC, Google Cloud OAuth credentials, Cloudflare Pages CDN/Edge DNS). Managing them across disjointed portals caused drift and cognitive overload.
2. **State Transparency & Speculative Execution**: CloudFormation change sets are clumsy, slow, and lack fine-grained diff predictability. Teams need a mandatory `plan`-before-`apply` workflow that shows exact resource additions, in-place updates, and destructive replacements before execution.
3. **Circular Dependencies**: In CloudFormation, setting up event-driven workflows (such as S3 bucket event notifications triggering Lambda) requires awkward workarounds or explicit resource naming tricks to break circular references. Terraform handles these natively as decoupled resources (`aws_s3_bucket`, `aws_lambda_permission`, `aws_s3_bucket_notification`).
4. **Environment Portability & White-Labeling**: Transitioning towards multi-tenant / multi-environment setups (dev, staging, prod, white-label client instances) requires declarative parameterization and reusable modules rather than duplicating YAML templates.

The key requirement for this migration was **zero data loss and zero downtime**: the production Cognito user pool (containing registered user accounts) and the reports S3 bucket (containing historical reports) had to be adopted into the new management state without being destroyed or recreated.

## 2. Decision
We migrated the entire Spry infrastructure to **Terraform** (`infra/` directory) and adopted **HCP Terraform (formerly Terraform Cloud)** as the central remote state and CI/CD execution backend:

1. **Declarative Modular Layout**:
   - `infra/versions.tf`: Provider requirements (`hashicorp/aws`, `hashicorp/random`, `hashicorp/archive`) and backend definition.
   - `infra/variables.tf`: Explicit typing and documentation for all project inputs.
   - `infra/auth.tf`: Cognito User Pool, Google IdP federated authentication, custom domain, app clients, and Managed Login branding.
   - `infra/reports.tf`: Decoupled EventBridge schedule, SQS queues (with DLQ), report builder, report mailer, and S3 bucket with lifecycle rules.
   - `infra/ai.tf`: Amazon Bedrock agenda parser Lambda, Function URL, public invoke permissions, and AWS Budgets cost alarm ($5/mo).
   - `infra/outputs.tf`: Central source of truth for application runtimes, Make targets, and frontend build env configs.

2. **Safe Resource Adoption without Recreation**:
   - CloudFormation stacks were updated with `DeletionPolicy: Retain` and decommissioned safely without affecting AWS resources.
   - Existing AWS resources were imported into Terraform state using Terraform `import` blocks and targeted imports.
   - Parity was verified until `terraform plan` reported:
     `No changes. Your infrastructure matches the configuration.`

3. **Remote Execution & Automated Governance via HCP Terraform**:
   - The infrastructure state is centrally stored and locked in HCP Terraform.
   - Applying infrastructure from local developer laptops is prohibited (`Makefile` only provides `make infra-plan` and `make infra-init`).
   - Changes follow the pull request workflow: a speculative `plan` runs automatically on PR creation/update; upon merge to `main`, HCP Terraform executes the `apply`.

## 3. Core Architectural Questions (Evaluation)

### 3.1. Why Terraform and not CloudFormation, CDK, or OpenTofu?
- **CloudFormation**: Rejected because it is proprietary to AWS and cannot manage non-AWS resources (such as Google OAuth clients, Cloudflare edge DNS/Pages, or GitHub repository configurations). Its template syntax is verbose, and circular dependencies require clumsy workarounds.
- **AWS CDK**: While expressive, CDK compiles down into CloudFormation stacks, inheriting CloudFormation's deployment speed limitations, rollback brittleness, and single-cloud restriction. Furthermore, imperative code can obscure the declared state of infrastructure.
- **OpenTofu**: An excellent open-source alternative. However, HashiCorp's HCP Terraform ecosystem provides out-of-the-box turnkey VCS integration, PR speculative plans, and native OIDC dynamic AWS credential management without managing private runner infrastructure. The Terraform HCL configuration remains compatible with OpenTofu should licensing needs evolve.
- **Terraform**: Selected for its mature provider ecosystem, declarative HCL syntax, first-class `plan` preview step, ecosystem-wide adoption, and seamless remote orchestration via HCP Terraform.

### 3.2. Who can change the infrastructure now, and how?
- **Permitted Path**: Developers change infrastructure **only by opening a GitHub Pull Request** modifying `.tf` files in `infra/`.
  1. HCP Terraform detects the PR via GitHub Webhook and runs a speculative `terraform plan`.
  2. Team members review the code and the plan output in the PR check.
  3. Once approved and merged into `main`, HCP Terraform assumes a dedicated AWS IAM Role via temporary OIDC credentials and applies the changes.
- **Emergency Path**: In an emergency (e.g. CI/CD or HCP outage), designated lead engineers with elevated AWS credentials and HCP state access can run `terraform apply` locally. Direct console changes are strictly forbidden to prevent configuration drift.

### 3.3. Where do the secrets end up, the state included?
- **Sensitive Variables**:
  - The Google OAuth Client Secret is marked `sensitive = true` in `variables.tf`. It is **never committed** to Git or `.tfvars` files.
  - In HCP Terraform, sensitive variables are stored in the workspace with the "Sensitive" flag enabled (write-only, masked in web UI and run logs).
- **State File**:
  - The state contains resource mappings and metadata, and may contain sensitive output attributes.
  - The state resides encrypted at rest (AES-256) and in transit (TLS 1.3) inside HCP Terraform's SOC 2-compliant managed backend.
  - State files are explicitly excluded from Git via `.gitignore` (`*.tfstate`, `*.tfstate.*`).
- **AWS Credentials**:
  - Zero permanent AWS Access Keys or Secrets are stored in HCP Terraform or GitHub. HCP Terraform authenticates to AWS dynamically via OpenID Connect (OIDC) using temporary STS credentials (`AssumeRoleWithWebIdentity`) that expire immediately after the run.

### 3.4. What happens if HCP Terraform is down?
- **Resilience of Running Systems**: AWS resources run completely independently of Terraform. If HCP Terraform experiences an outage, all active production services (Aurora DB, Lambda, Cognito, S3, Cloudflare frontend) continue operating normally without interruption.
- **Operational Contingency**:
  1. If urgent infrastructure changes are required during an HCP outage, developers can download the latest encrypted state snapshot (or use state migration/fallback) and point `versions.tf` to an emergency S3 backend or local state with S3 locking.
  2. Because the code is declarative in Git, the exact desired state is always available.
  3. Once HCP Terraform recovers, state synchronization can be restored cleanly.

## 4. Alternatives Considered
1. **Keeping CloudFormation for existing resources and using Terraform only for new ones**:
   - *Rejected*: Creates a split-brain architecture where half the system is defined in YAML and half in HCL, complicating deployments and dependency wiring.
2. **Storing Terraform state in an S3 Bucket + DynamoDB table**:
   - *Rejected for primary team workflow*: While functional, self-managed S3 backends require manual IAM configuration, custom CI/CD runner pipelines for PR plan previews, and do not provide out-of-the-box team collaboration UI comparable to HCP Terraform.

## 5. Consequences
- **Positive**:
  - Single unified toolchain for the entire Spry infrastructure.
  - 100% data preservation: zero user accounts lost from Cognito, zero reports lost from S3.
  - Complete elimination of manual console creation and invisible drift.
  - Safe PR-driven review workflow where every infrastructure change is planned before being applied.
  - Zero long-lived AWS credentials stored in third-party services.
- **Trade-offs / Mitigations**:
  - Terraform does not provide automatic rollback on failure midway through an apply. Mitigated by thorough speculative `plan` reviews on pull requests and idempotent resource definitions.
