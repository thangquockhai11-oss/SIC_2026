"""Environment based application settings."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime settings loaded from TRUSTMEDIA_* variables."""

    model_config = SettingsConfigDict(
        env_prefix="TRUSTMEDIA_",
        env_file=[str(BACKEND_DIR / ".env"), ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "TrustMedia AI API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./trustmedia.db"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    jwt_secret: str = "trustmedia-ai-development-secret-key-32chars-min"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    gemini_api_key: str | None = None
    ai_model: str = "gemini-2.5-flash"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return one settings instance per process."""
    return Settings()
