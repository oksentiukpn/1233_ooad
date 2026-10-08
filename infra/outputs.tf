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
  value       = "postgresql+psycopg://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.project_name}?sslmode=require"
  sensitive   = true
}

output "lambda_function_name" {
  description = "Name of the AWS Lambda backend function"
  value       = length(aws_lambda_function.backend) > 0 ? aws_lambda_function.backend[0].function_name : ""
}

output "lambda_function_arn" {
  description = "ARN of the AWS Lambda backend function"
  value       = length(aws_lambda_function.backend) > 0 ? aws_lambda_function.backend[0].arn : ""
}

output "lambda_function_url" {
  description = "AWS Lambda Function URL (Public HTTPS endpoint, $0 idle compute)"
  value       = length(aws_lambda_function_url.backend) > 0 ? aws_lambda_function_url.backend[0].function_url : ""
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
