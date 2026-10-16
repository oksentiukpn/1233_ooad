output "agenda_parser_function_name" {
  description = "AWS Lambda agenda parser function name"
  value       = aws_lambda_function.agenda_parser.function_name
}

output "agenda_parser_function_url" {
  description = "AWS Lambda Function URL for agenda parser"
  value       = aws_lambda_function_url.agenda_parser.function_url
}
