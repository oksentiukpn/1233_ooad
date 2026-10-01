# ==============================================================================
# Step 8: GitHub Actions OIDC Authentication (Zero Long-Lived Keys)
# ==============================================================================
# Security Principle: No permanent credentials stored in GitHub Secrets.
# GitHub generates a signed OIDC JWT token per workflow run, which AWS STS exchanges
# for temporary credentials valid only for the duration of the job (~15 mins).
# ==============================================================================

# 1. GitHub OIDC Identity Provider in AWS IAM
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f8d2e0f863"]

  tags = {
    Name      = "spry-github-oidc-provider"
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# 2. Scoped IAM Role for GitHub Actions
# Strict Trust Policy: ONLY commits pushed to main in oksentiukpn/1233_ooad can assume this role.
resource "aws_iam_role" "github_actions" {
  name = "spry-github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = [
              "repo:oksentiukpn/1233_ooad:ref:refs/heads/main",
              "repo:oksentiukpn*/1233_ooad*:ref:refs/heads/main"
            ]
          }
        }
      }
    ]
  })

  tags = {
    Name      = "spry-github-actions-role"
    Project   = var.project_name
    ManagedBy = "Terraform"
  }
}

# 3. Principle of Least Privilege: ECR + App Runner + ECS Deployment Permissions
resource "aws_iam_role_policy" "github_actions_deploy" {
  name = "spry-github-actions-deploy-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # ECR Authentication Token (requires * per AWS docs)
      {
        Sid      = "ECRAuthToken"
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      # ECR Image Push & Tagging permissions
      {
        Sid    = "ECRImageManagement"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories",
          "ecr:ListImages"
        ]
        Resource = aws_ecr_repository.backend.arn
      },
      # AWS App Runner Deployment permissions
      {
        Sid    = "AppRunnerServiceRoll"
        Effect = "Allow"
        Action = [
          "apprunner:ListServices",
          "apprunner:DescribeService",
          "apprunner:UpdateService",
          "apprunner:StartDeployment"
        ]
        Resource = "*"
      },
      # AWS ECS Rolling Deployment permissions (if ECS is used)
      {
        Sid    = "ECSDeployment"
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:UpdateService"
        ]
        Resource = "*"
      }
    ]
  })
}

output "github_actions_role_arn" {
  description = "The ARN of the IAM role for GitHub Actions OIDC"
  value       = aws_iam_role.github_actions.arn
}
