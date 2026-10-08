variable "aws_region" {
  description = "AWS Region (us-east-1 N. Virginia per architecture-migration.md)"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "spry"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "spry_admin"
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
  default     = "SprySecure2026Password!"
}

variable "db_instance_class" {
  description = "Legacy RDS DB Instance class (kept for backward compatibility)"
  type        = string
  default     = "db.t4g.micro"
}

variable "aurora_min_capacity" {
  description = "Aurora Serverless v2 min ACU (0 means auto-paused when idle)"
  type        = number
  default     = 0
}

variable "aurora_max_capacity" {
  description = "Aurora Serverless v2 max ACU"
  type        = number
  default     = 1.0
}

variable "aurora_auto_pause_seconds" {
  description = "Seconds of inactivity before Aurora Serverless v2 automatically pauses"
  type        = number
  default     = 300
}

variable "app_port" {
  description = "Port exposed by the FastAPI container"
  type        = number
  default     = 8000
}

variable "enable_lambda" {
  description = "Whether to provision the AWS Lambda backend service (Serverless, $0 idle cost)"
  type        = bool
  default     = true
}

variable "lambda_memory_size" {
  description = "Memory allocated to AWS Lambda in MB"
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Timeout for AWS Lambda in seconds"
  type        = number
  default     = 60
}

variable "enable_app_runner" {
  description = "Whether to provision App Runner service (deprecated, migrated to Lambda)"
  type        = bool
  default     = false
}

variable "enable_cloudfront" {
  description = "Whether to provision CloudFront for frontend distribution (set to false when using Cloudflare Pages)"
  type        = bool
  default     = false
}

variable "oauth_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  default     = ""
}

variable "oauth_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "resend_api_key" {
  description = "Resend API Key for transactional emails"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cognito_domain_prefix" {
  description = "Cognito User Pool Domain Prefix in us-east-1"
  type        = string
  default     = "spry-1233"
}
