variable "aws_region" {
  description = "AWS Region (eu-central-1 Frankfurt per architecture.md)"
  type        = string
  default     = "eu-central-1"
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
  description = "RDS DB Instance class (db.t4g.micro for AWS Free Tier / minimal cost)"
  type        = string
  default     = "db.t4g.micro"
}

variable "app_port" {
  description = "Port exposed by the FastAPI container"
  type        = number
  default     = 8000
}

variable "enable_app_runner" {
  description = "Whether to provision the App Runner service (requires image to be pushed to ECR first)"
  type        = bool
  default     = true
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
