import json
from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/spry"
    ENVIRONMENT: str = "development"
    AWS_REGION: str = "us-east-1"
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://1233.pp.ua",
        "https://www.1233.pp.ua",
        "https://api.1233.pp.ua",
    ]

    # Google OAuth credentials (supports both OAUTH_* and GOOGLE_* names)
    OAUTH_CLIENT_ID: str = ""
    OAUTH_CLIENT_SECRET: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Amazon Cognito User Pool configuration
    COGNITO_USER_POOL_ID: str = "us-east-1_7FvYNO3Qp"
    COGNITO_CLIENT_ID: str = "3f1rgrm4hrmsuhhbmfjjle9t28"
    COGNITO_JWKS: str = ""

    # Frontend URL for post-login redirects
    FRONTEND_URL: str = "https://1233.pp.ua"

    # JWT Authentication configuration
    JWT_SECRET_KEY: str = "spry-super-secret-jwt-key-2026-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Resend Email Integration
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "Spry <onboarding@resend.dev>"

    @property
    def effective_google_client_id(self) -> str:
        return self.GOOGLE_CLIENT_ID or self.OAUTH_CLIENT_ID

    @property
    def effective_google_client_secret(self) -> str:
        return self.GOOGLE_CLIENT_SECRET or self.OAUTH_CLIENT_SECRET

    @property
    def cognito_iss(self) -> str:
        return f"https://cognito-idp.{self.AWS_REGION}.amazonaws.com/{self.COGNITO_USER_POOL_ID}"

    @property
    def cognito_jwks_url(self) -> str:
        return f"{self.cognito_iss}/.well-known/jwks.json"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v_trimmed = v.strip()
            if v_trimmed.startswith("[") and v_trimmed.endswith("]"):
                try:
                    parsed = json.loads(v_trimmed)
                    if isinstance(parsed, list):
                        return [str(item) for item in parsed]
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return [str(i) for i in v]
        raise ValueError(v)

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
