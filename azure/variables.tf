variable "prefix" {
  type        = string
  description = "Resource name prefix for Spry Azure deployment"
  default     = "spry"
}

variable "location" {
  type        = string
  description = "Azure region for resources (must be one of allowed regions by Azure for Students policy)"
  default     = "norwayeast"
}

variable "db_username" {
  type        = string
  description = "PostgreSQL administrator username"
  default     = "spryadmin"
}

variable "db_name" {
  type        = string
  description = "PostgreSQL database name"
  default     = "spry"
}

variable "container_image" {
  type        = string
  description = "Container image for Spry backend API (publicly accessible OCI image)"
  default     = "ghcr.io/oksentiukpn/spry-backend:latest"
}

variable "target_port" {
  type        = number
  description = "Target port for container ingress (80 for quickstart, 8000 for Spry FastAPI)"
  default     = 8000
}

variable "cors_origins" {
  type        = list(string)
  description = "Allowed origins for CORS"
  default = [
    "https://1233.pp.ua",
    "https://www.1233.pp.ua",
    "https://azure.1233.pp.ua",
    "https://spry.pages.dev",
    "http://localhost:5173",
    "http://localhost:3000"
  ]
}

variable "cognito_user_pool_id" {
  type        = string
  description = "AWS Cognito User Pool ID for cross-cloud authentication"
  default     = "us-east-1_7FvYNO3Qp"
}

variable "cognito_client_id" {
  type        = string
  description = "AWS Cognito App Client ID for authentication"
  default     = "3f1rgrm4hrmsuhhbmfjjle9t28"
}

variable "jwt_secret_key" {
  type        = string
  description = "Secret key for local JWT validation"
  default     = "spry-super-secret-jwt-key-2026-production"
}
