from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── App ────────────────────────────────────────────────────────────────────
    APP_NAME: str = "RePlate API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # ── Dev shortcut ───────────────────────────────────────────────────────────
    # When True: skip WorkOS entirely and use local email+password auth
    SKIP_WORKOS: bool = False

    # ── CORS ───────────────────────────────────────────────────────────────────
    # Comma-separated origins allowed to call the API
    ALLOWED_ORIGINS: str = (
        "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000"
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    # ── Database ───────────────────────────────────────────────────────────────
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "replate"
    DB_USER: str = "replate_user"
    DB_PASSWORD: str = ""

    @property
    def database_url(self) -> str:
        return (
            f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )

    @property
    def sync_database_url(self) -> str:
        """Synchronous URL used only by Alembic migrations."""
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            f"?charset=utf8mb4"
        )

    # ── WorkOS ─────────────────────────────────────────────────────────────────
    WORKOS_API_KEY: str = ""
    WORKOS_CLIENT_ID: str = ""
    # The URL WorkOS will redirect to after auth (your /auth/callback endpoint)
    WORKOS_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/callback"

    # ── JWT ────────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "change-me-in-production-use-a-long-random-secret"
    JWT_ALGORITHM: str = "HS256"
    # Token expiry in minutes
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # ── Frontend ───────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Backend public URL (used to build absolute upload URLs) ───────────────
    BACKEND_URL: str = "http://localhost:8000"

    # ── Uploads ────────────────────────────────────────────────────────────────
    # Directory (relative to the backend/ working directory) where uploaded
    # files are stored.  Created automatically on startup if it does not exist.
    UPLOAD_DIR: str = "uploads"

    # ── Groq AI ────────────────────────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_ENDPOINT: str = "https://api.groq.com/openai/v1/chat/completions"


settings = Settings()
