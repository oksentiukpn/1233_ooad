# ==============================================================================
# Amazon Cognito User Pool & Authentication (Lab 4, Steps 1-2)
# ==============================================================================

resource "aws_cognito_user_pool" "pool" {
  name                     = "${var.project_name}-user-pool"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  user_pool_tier           = "ESSENTIALS"

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  tags = {
    Name    = "${var.project_name}-user-pool"
    Project = var.project_name
  }
}

resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.pool.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.oauth_client_id
    client_secret    = var.oauth_client_secret
    authorize_scopes = "openid email profile"
  }

  attribute_mapping = {
    email          = "email"
    email_verified = "email_verified"
  }
}

resource "aws_cognito_user_pool_client" "client" {
  name         = "${var.project_name}-client"
  user_pool_id = aws_cognito_user_pool.pool.id

  generate_secret                      = false
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = ["COGNITO", "Google"]
  allowed_oauth_flows_user_pool_client = true

  callback_urls = [
    "https://1233.pp.ua/auth/callback/",
    "https://1233.pp.ua/auth/callback",
    "https://1233.pp.ua/",
    "http://localhost:5173/auth/callback/",
    "http://localhost:5173/auth/callback",
    "http://localhost:5173/"
  ]

  logout_urls = [
    "https://1233.pp.ua/",
    "https://1233.pp.ua/login/",
    "http://localhost:5173/",
    "http://localhost:5173/login/"
  ]

  depends_on = [aws_cognito_identity_provider.google]
}

resource "aws_cognito_user_pool_domain" "domain" {
  domain                = var.cognito_domain_prefix
  user_pool_id          = aws_cognito_user_pool.pool.id
  managed_login_version = 2
}

# Managed login version 2 requires branding with UseCognitoProvidedValues: true
resource "terraform_data" "managed_login_branding" {
  input = {
    user_pool_id = aws_cognito_user_pool.pool.id
    client_id    = aws_cognito_user_pool_client.client.id
    domain       = aws_cognito_user_pool_domain.domain.id
  }

  provisioner "local-exec" {
    command = "aws cognito-idp create-managed-login-branding --user-pool-id ${aws_cognito_user_pool.pool.id} --client-id ${aws_cognito_user_pool_client.client.id} --use-cognito-provided-values --region ${var.aws_region} || true"
  }

  depends_on = [
    aws_cognito_user_pool_client.client,
    aws_cognito_user_pool_domain.domain
  ]
}
