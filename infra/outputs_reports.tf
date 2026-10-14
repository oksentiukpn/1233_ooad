output "reports_bucket_name" {
  description = "Name of S3 bucket for weekly reports"
  value       = aws_s3_bucket.reports.id
}

output "report_requests_queue_url" {
  description = "URL of SQS queue for report requests"
  value       = aws_sqs_queue.report_requests.url
}

output "report_requests_queue_arn" {
  description = "ARN of SQS queue for report requests"
  value       = aws_sqs_queue.report_requests.arn
}

output "report_builder_function_name" {
  description = "Name of report builder Lambda"
  value       = aws_lambda_function.report_builder.function_name
}

output "report_mailer_function_name" {
  description = "Name of report mailer Lambda"
  value       = aws_lambda_function.report_mailer.function_name
}

output "report_schedule_name" {
  description = "Name of EventBridge Scheduler schedule"
  value       = aws_scheduler_schedule.weekly_report.name
}
