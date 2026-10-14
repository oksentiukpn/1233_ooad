# ==============================================================================
# SPRY MONOREPO — LAB 5: EVENT-DRIVEN WEEKLY REPORTING INFRASTRUCTURE
# ==============================================================================
# Components:
# 1. Private S3 Bucket (spry-reports-<account_id>) with 90-day retention
# 2. Gateway VPC Endpoint for S3 (com.amazonaws.us-east-1.s3)
# 3. SQS Queue (spry-report-requests) + DLQ (spry-report-requests-dlq)
# 4. Lambda report-builder (in VPC, Aurora access, S3 PutObject)
# 5. Lambda report-mailer (outside VPC, S3 GetObject, SES send_email)
# 6. S3 ObjectCreated Event Notification -> report-mailer
# 7. EventBridge Scheduler (cron Mondays 07:00 Kyiv) -> SQS
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. S3 Reports Bucket & Gateway VPC Endpoint
# ------------------------------------------------------------------------------
resource "aws_s3_bucket" "reports" {
  bucket        = "${var.project_name}-reports-${data.aws_caller_identity.current.account_id}"
  force_destroy = true

  tags = {
    Name    = "${var.project_name}-reports"
    Project = var.project_name
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "reports_retention" {
  bucket = aws_s3_bucket.reports.id

  rule {
    id     = "delete-reports-after-90-days"
    status = "Enabled"

    filter {
      prefix = "reports/"
    }

    expiration {
      days = 90
    }
  }
}

resource "aws_s3_bucket_public_access_block" "reports" {
  bucket                  = aws_s3_bucket.reports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

data "aws_route_tables" "default" {
  vpc_id = data.aws_vpc.default.id
}

resource "aws_vpc_endpoint" "s3_gateway" {
  vpc_id            = data.aws_vpc.default.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = data.aws_route_tables.default.ids

  tags = {
    Name    = "${var.project_name}-s3-gateway-endpoint"
    Project = var.project_name
  }
}

# ------------------------------------------------------------------------------
# 2. SQS Queues (Main Request Queue + Dead-Letter Queue)
# ------------------------------------------------------------------------------
resource "aws_sqs_queue" "report_requests_dlq" {
  name                      = "${var.project_name}-report-requests-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name    = "${var.project_name}-report-requests-dlq"
    Project = var.project_name
  }
}

resource "aws_sqs_queue" "report_requests" {
  name                       = "${var.project_name}-report-requests"
  visibility_timeout_seconds = 360 # 6x Lambda 60s timeout

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.report_requests_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name    = "${var.project_name}-report-requests"
    Project = var.project_name
  }
}

# ------------------------------------------------------------------------------
# 3. IAM Permissions for report-builder
# ------------------------------------------------------------------------------
resource "aws_iam_role_policy" "lambda_builder_permissions" {
  name = "${var.project_name}-lambda-builder-permissions"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.reports.arn,
          "${aws_s3_bucket.reports.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = aws_sqs_queue.report_requests.arn
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# 4. Lambda Function: report-builder (in VPC, Aurora access, S3 PutObject)
# ------------------------------------------------------------------------------
resource "aws_lambda_function" "report_builder" {
  function_name = "${var.project_name}-report-builder"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.backend.repository_url}:latest"
  timeout       = 60
  memory_size   = 512

  image_config {
    command = ["app.reports.lambda_handler.handler"]
  }

  vpc_config {
    subnet_ids         = data.aws_subnets.default.ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DATABASE_URL   = "postgresql+psycopg://${var.db_username}:${var.db_password}@${aws_rds_cluster.aurora.endpoint}:${aws_rds_cluster.aurora.port}/${var.project_name}?sslmode=require"
      REPORTS_BUCKET = aws_s3_bucket.reports.id
    }
  }

  depends_on = [
    aws_vpc_endpoint.s3_gateway,
    aws_iam_role_policy.lambda_builder_permissions
  ]

  tags = {
    Name    = "${var.project_name}-report-builder"
    Project = var.project_name
  }
}

resource "aws_lambda_event_source_mapping" "report_requests" {
  event_source_arn = aws_sqs_queue.report_requests.arn
  function_name    = aws_lambda_function.report_builder.arn
  batch_size       = 1
  enabled          = true
}

# ------------------------------------------------------------------------------
# 5. IAM Role & Lambda Function: report-mailer (outside VPC)
# ------------------------------------------------------------------------------
resource "aws_iam_role" "report_mailer" {
  name = "${var.project_name}-report-mailer-role"

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
    Name    = "${var.project_name}-report-mailer-role"
    Project = var.project_name
  }
}

resource "aws_iam_role_policy" "report_mailer_permissions" {
  name = "${var.project_name}-report-mailer-policy"
  role = aws_iam_role.report_mailer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.reports.arn}/reports/*"
      },
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
          "sesv2:SendEmail"
        ]
        Resource = "*"
      }
    ]
  })
}

data "archive_file" "report_mailer_zip" {
  type        = "zip"
  output_path = "${path.module}/report_mailer.zip"

  source {
    content  = file("${path.module}/../backend/app/reports/mailer_handler.py")
    filename = "mailer_handler.py"
  }
}

resource "aws_lambda_function" "report_mailer" {
  function_name    = "${var.project_name}-report-mailer"
  role             = aws_iam_role.report_mailer.arn
  runtime          = "python3.12"
  handler          = "mailer_handler.handler"
  filename         = data.archive_file.report_mailer_zip.output_path
  source_code_hash = data.archive_file.report_mailer_zip.output_base64sha256
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      REPORT_SENDER_EMAIL    = "reports@1233.pp.ua"
      REPORT_RECIPIENT_EMAIL = "oksentiuk.pn@ucu.edu.ua"
    }
  }

  tags = {
    Name    = "${var.project_name}-report-mailer"
    Project = var.project_name
  }
}

resource "aws_lambda_permission" "allow_s3_to_invoke_mailer" {
  statement_id  = "AllowS3InvokeReportMailer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.report_mailer.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.reports.arn
}

resource "aws_s3_bucket_notification" "report_created" {
  bucket = aws_s3_bucket.reports.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.report_mailer.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "reports/"
    filter_suffix       = ".csv"
  }

  depends_on = [aws_lambda_permission.allow_s3_to_invoke_mailer]
}

# ------------------------------------------------------------------------------
# 6. EventBridge Scheduler (cron Mondays 07:00 Europe/Kyiv) -> SQS
# ------------------------------------------------------------------------------
resource "aws_iam_role" "scheduler" {
  name = "${var.project_name}-report-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "scheduler.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name    = "${var.project_name}-report-scheduler-role"
    Project = var.project_name
  }
}

resource "aws_iam_role_policy" "scheduler_sqs" {
  name = "${var.project_name}-scheduler-send-message"
  role = aws_iam_role.scheduler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.report_requests.arn
      }
    ]
  })
}

resource "aws_scheduler_schedule" "weekly_report" {
  name                         = "${var.project_name}-weekly-report-schedule"
  schedule_expression          = "cron(0 7 ? * MON *)"
  schedule_expression_timezone = "Europe/Kyiv"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_sqs_queue.report_requests.arn
    role_arn = aws_iam_role.scheduler.arn

    input = jsonencode({
      week   = null
      source = "schedule"
    })
  }
}
