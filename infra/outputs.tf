output "database_url" {
  description = "PostgreSQL Connection URL"
  value       = "postgresql+psycopg://${var.db_username}:${var.db_password}@${aws_rds_cluster.aurora.endpoint}:${aws_rds_cluster.aurora.port}/${var.project_name}?sslmode=require"
  sensitive   = true
}

output "rds_endpoint" {
  description = "Aurora Serverless v2 PostgreSQL Endpoint"
  value       = "${aws_rds_cluster.aurora.endpoint}:${aws_rds_cluster.aurora.port}"
}

output "rds_address" {
  description = "Aurora Serverless v2 PostgreSQL Host Address"
  value       = aws_rds_cluster.aurora.endpoint
}

output "ecr_repository_url" {
  description = "Amazon ECR Repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "lambda_function_name" {
  description = "Backend AWS Lambda function name"
  value       = length(aws_lambda_function.backend) > 0 ? aws_lambda_function.backend[0].function_name : ""
}

output "lambda_function_arn" {
  description = "Backend AWS Lambda function ARN"
  value       = length(aws_lambda_function.backend) > 0 ? aws_lambda_function.backend[0].arn : ""
}

output "lambda_function_url" {
  description = "Backend AWS Lambda Function URL for direct browser access"
  value       = length(aws_lambda_function_url.backend) > 0 ? aws_lambda_function_url.backend[0].function_url : ""
}

output "frontend_s3_bucket" {
  description = "Frontend S3 bucket name"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_s3_website_url" {
  description = "Frontend S3 static website endpoint"
  value       = "http://${aws_s3_bucket.frontend.id}.s3-website-${var.aws_region}.amazonaws.com"
}

output "cloudfront_domain_name" {
  description = "CloudFront HTTPS distribution URL"
  value       = length(aws_cloudfront_distribution.frontend) > 0 ? "https://${aws_cloudfront_distribution.frontend[0].domain_name}" : "CloudFront not enabled"
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.pool.id
}

output "cognito_user_pool_client_id" {
  description = "Cognito User Pool App Client ID"
  value       = aws_cognito_user_pool_client.client.id
}

output "cognito_authority" {
  description = "Cognito OIDC Authority URL"
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.pool.id}"
}

output "cognito_domain" {
  description = "Cognito Domain Name"
  value       = "https://${aws_cognito_user_pool_domain.domain.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "cognito_login_url" {
  description = "Cognito Hosted UI Login URL"
  value       = "https://${aws_cognito_user_pool_domain.domain.domain}.auth.${var.aws_region}.amazoncognito.com/login?client_id=${aws_cognito_user_pool_client.client.id}&response_type=code&scope=email+openid+profile&redirect_uri=https://1233.pp.ua/auth/callback/"
}
