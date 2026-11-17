import os
import secrets
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "GetSATGo API"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./getsatgo.db")
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    )
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    TEACHER_SIGNUP_CODE: str = os.getenv("TEACHER_SIGNUP_CODE", "")
    SUPERUSER_EMAIL: str = os.getenv("SUPERUSER_EMAIL", "")
    SUPERUSER_PASSWORD: str = os.getenv("SUPERUSER_PASSWORD", "")
    SUPERUSER_NAME: str = os.getenv("SUPERUSER_NAME", "Madhav Mittal")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "").strip()

settings = Settings()

if settings.ENVIRONMENT.lower() == "production" and len(os.getenv("SECRET_KEY", "")) < 32:
    raise RuntimeError("A SECRET_KEY of at least 32 characters is required in production.")
if settings.ENVIRONMENT.lower() == "production":
    missing_production_settings = [
        key for key in ("DATABASE_URL", "FRONTEND_URL") if not os.getenv(key)
    ]
    if missing_production_settings:
        raise RuntimeError(
            "Production configuration is missing: " + ", ".join(missing_production_settings)
        )

