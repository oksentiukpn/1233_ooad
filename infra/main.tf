data "aws_caller_identity" "current" {}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# ==============================================================================
# 1. Amazon ECR — Container Registry (Cost: $0 within 500MB Free Tier)
# ==============================================================================
resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "backend_cleanup" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep only the last 3 images to minimize storage costs"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 3
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ==============================================================================
# 2. RDS PostgreSQL 16 (db.t4g.micro, Single-AZ, Free Tier: 20GB gp3)
# ==============================================================================
resource "aws_db_subnet_group" "rds" {
  name        = "${var.project_name}-rds-subnets"
  subnet_ids  = data.aws_subnets.default.ids
  description = "Subnet group for Spry RDS PostgreSQL"
}

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Allow inbound PostgreSQL traffic"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "PostgreSQL access"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Protected by strong DB master password
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "postgres" {
  identifier                 = "${var.project_name}-postgres"
  engine                     = "postgres"
  engine_version             = "16.9"
  instance_class             = var.db_instance_class
  allocated_storage          = 20
  max_allocated_storage      = 20 # Prevents auto-scaling beyond free tier
  storage_type               = "gp3"
  db_name                    = var.project_name
  username                   = var.db_username
  password                   = var.db_password
  db_subnet_group_name       = aws_db_subnet_group.rds.name
  vpc_security_group_ids     = [aws_security_group.rds.id]
  publicly_accessible        = true
  skip_final_snapshot        = true
  backup_retention_period    = 0 # No automated snapshot storage charges
  deletion_protection        = false
  auto_minor_version_upgrade = true
}

# ==============================================================================
# 3. AWS App Runner — Core API (Minimal idle compute, scales to low memory)
# ==============================================================================
resource "aws_iam_role" "apprunner_ecr_access" {
  name = "${var.project_name}-apprunner-ecr-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  role       = aws_iam_role.apprunner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

resource "aws_apprunner_service" "backend" {
  count        = var.enable_app_runner ? 1 : 0
  service_name = "${var.project_name}-backend"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    auto_deployments_enabled = true

    image_repository {
      image_identifier      = "${aws_ecr_repository.backend.repository_url}:latest"
      image_repository_type = "ECR"

      image_configuration {
        port = tostring(var.app_port)
        runtime_environment_variables = {
          DATABASE_URL = "postgresql+psycopg://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.project_name}"
          CORS_ORIGINS = jsonencode(["*"])
          PORT         = tostring(var.app_port)
        }
      }
    }
  }

  instance_configuration {
    cpu    = "0.25 vCPU"
    memory = "0.5 GB" # Minimal idle memory footprint ($0.007/GB-hr -> ~$2.50/mo idle)
  }

  depends_on = [
    aws_iam_role_policy_attachment.apprunner_ecr,
    aws_db_instance.postgres
  ]
}

# ==============================================================================
# 4. Frontend Hosting (S3 + CloudFront CDN with SPA Routing)
# ==============================================================================
resource "aws_s3_bucket" "frontend" {
  bucket        = "${var.project_name}-frontend-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_policy" "frontend_public_read" {
  bucket     = aws_s3_bucket.frontend.id
  depends_on = [aws_s3_bucket_public_access_block.frontend]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
      }
    ]
  })
}

resource "aws_cloudfront_distribution" "frontend" {
  count = var.enable_cloudfront ? 1 : 0

  origin {
    domain_name = aws_s3_bucket_website_configuration.frontend.website_endpoint
    origin_id   = "S3-Website-${aws_s3_bucket.frontend.id}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Website-${aws_s3_bucket.frontend.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # SPA Custom Error Response (routing React single page application)
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  price_class = "PriceClass_100" # Cheapest CloudFront tier (EU and US edge locations only)
}
