# ==============================================================================
# SPRY MONOREPO — LAB 6: AI AGENDA PARSER INFRASTRUCTURE (AMAZON BEDROCK)
# ==============================================================================
# Architecture:
# - Function: spry-agenda-parser runs OUTSIDE VPC ($0 idle cost, direct Bedrock access)
# - Trigger: Public HTTPS Function URL with CORS
# - Security: Cognito JWT Verification & Input Length Check (<= 10,000 chars)
# - Model: mistral.ministral-3-14b-instruct (Converse API with toolCalling)
# - Safety: AWS Budgets Alarm ($5/month limit)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. IAM Execution Role for Agenda Parser (outside VPC)
# ------------------------------------------------------------------------------
resource "aws_iam_role" "agenda_parser" {
  name = "${var.project_name}-agenda-parser-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name    = "${var.project_name}-agenda-parser-role"
    Project = var.project_name
  }
}

resource "aws_iam_role_policy_attachment" "agenda_parser_basic" {
  role       = aws_iam_role.agenda_parser.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "agenda_parser_bedrock_policy" {
  name = "${var.project_name}-agenda-parser-bedrock-policy"
  role = aws_iam_role.agenda_parser.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:Converse",
          "bedrock-mantle:CreateInference"
        ]
        Resource = "*"
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# 2. AWS Lambda Function: spry-agenda-parser (outside VPC)
# ------------------------------------------------------------------------------
resource "aws_lambda_function" "agenda_parser" {
  function_name = "${var.project_name}-agenda-parser"
  role          = aws_iam_role.agenda_parser.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.backend.repository_url}:latest"
  timeout       = 30
  memory_size   = 512

  image_config {
    command = ["app.ai.agenda_lambda.handler"]
  }

  environment {
    variables = {
      PARSER_MODEL         = "mistral.ministral-3-14b-instruct"
      PARSER_REGION        = var.aws_region
      COGNITO_USER_POOL_ID = aws_cognito_user_pool.pool.id
      COGNITO_CLIENT_ID    = aws_cognito_user_pool_client.client.id
    }
  }

  tags = {
    Name    = "${var.project_name}-agenda-parser"
    Project = var.project_name
  }
}

# ------------------------------------------------------------------------------
# 3. AWS Lambda Function URL with CORS
# ------------------------------------------------------------------------------
resource "aws_lambda_function_url" "agenda_parser" {
  function_name      = aws_lambda_function.agenda_parser.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = false
    allow_origins = [
      "https://1233.pp.ua",
      "https://www.1233.pp.ua",
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ]
    allow_methods = ["*"]
    allow_headers = ["*"]
    max_age       = 86400
  }
}

resource "aws_lambda_permission" "allow_public_function_url_agenda_parser" {
  statement_id           = "FunctionURLAllowPublicAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.agenda_parser.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "allow_public_invoke_agenda_parser" {
  statement_id  = "AllowPublicInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.agenda_parser.function_name
  principal     = "*"
}

# ------------------------------------------------------------------------------
# 4. AWS Budgets Alarm ($5/month limit)
# ------------------------------------------------------------------------------
resource "aws_budgets_budget" "ai_cost_budget" {
  name              = "${var.project_name}-monthly-ai-budget"
  budget_type       = "COST"
  limit_amount      = "5.0"
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["oksentiuk.pn@ucu.edu.ua"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["oksentiuk.pn@ucu.edu.ua"]
  }
}
