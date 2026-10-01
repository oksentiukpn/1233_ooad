output "ecr_repository_url" {
  description = "URL of the Amazon ECR repository"
  value       = aws_ecr_repository.backend.repository_url
}

output "rds_endpoint" {
  description = "PostgreSQL RDS connection endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_address" {
  description = "PostgreSQL host address"
  value       = aws_db_instance.postgres.address
}

output "database_url" {
  description = "Full SQLAlchemy Database URL for Alembic and application"
  value       = "postgresql+psycopg://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.project_name}"
  sensitive   = true
}

output "apprunner_service_url" {
  description = "Public URL of the AWS App Runner API"
  value       = length(aws_apprunner_service.backend) > 0 ? "https://${aws_apprunner_service.backend[0].service_url}" : "App Runner not enabled yet"
}

output "frontend_s3_bucket" {
  description = "S3 bucket name for frontend hosting"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_s3_website_url" {
  description = "S3 static website direct URL"
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

output "cloudfront_domain_name" {
  description = "CloudFront HTTPS distribution URL"
  value       = length(aws_cloudfront_distribution.frontend) > 0 ? "https://${aws_cloudfront_distribution.frontend[0].domain_name}" : "CloudFront not enabled"
}
