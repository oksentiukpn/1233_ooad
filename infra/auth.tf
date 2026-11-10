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
    "https://azure.1233.pp.ua/auth/callback/",
    "https://azure.1233.pp.ua/auth/callback",
    "https://azure.1233.pp.ua/",
    "http://localhost:5173/auth/callback/",
    "http://localhost:5173/auth/callback",
    "http://localhost:5173/"
  ]

  logout_urls = [
    "https://1233.pp.ua/",
    "https://1233.pp.ua/login/",
    "https://azure.1233.pp.ua/",
    "https://azure.1233.pp.ua/login/",
    "http://localhost:5173/",
    "http://localhost:5173/login/"
  ]

  depends_on = [aws_cognito_identity_provider.google]
}
