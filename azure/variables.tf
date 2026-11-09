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
  default     = "mcr.microsoft.com/k8se/quickstart:latest"
}

variable "target_port" {
  type        = number
  description = "Target port for container ingress (80 for quickstart, 8000 for Spry FastAPI)"
  default     = 80
}

variable "cors_origins" {
  type        = list(string)
  description = "Allowed origins for CORS"
  default = [
    "https://1233.pp.ua",
    "https://www.1233.pp.ua",
    "https://spry.pages.dev",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ]
}

variable "jwt_secret_key" {
  type        = string
  description = "Secret key for JWT validation"
  default     = "spry-super-secret-jwt-key-2026-production"
}

variable "cognito_user_pool_id" {
  type        = string
  description = "Amazon Cognito User Pool ID (for hybrid auth)"
  default     = "us-east-1_7FvYNO3Qp"
}

variable "cognito_client_id" {
  type        = string
  description = "Amazon Cognito Client ID"
  default     = "3f1rgrm4hrmsuhhbmfjjle9t28"
}
