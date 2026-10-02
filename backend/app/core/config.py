import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Centralized application configuration loaded from environment variables."""

    APP_NAME: str = os.getenv("APP_NAME", "RepairTrack API")
    APP_VERSION: str = os.getenv("APP_VERSION", "0.1.0")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # CORS — comma-separated list of allowed origins
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./repairtrack.db")

    # JWT — secret MUST be overridden in production via .env
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-this-in-real-env")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )

    # ---------------------------------------------------------------------------
    # Phase 5.8 -- AI Repair Assistance (Google Gemini)
    # GEMINI_API_KEY must be set in .env; NEVER hardcode the value here.
    # Leave blank to disable AI features without errors.
    # ---------------------------------------------------------------------------
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

    @property
    def allowed_origins(self) -> list[str]:
        """Return all allowed CORS origins."""
        origins = [
            self.FRONTEND_URL,
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:3000",
        ]
        # Vite may fall back to other local ports; add common alternatives
        extra = os.getenv("EXTRA_CORS_ORIGINS", "")
        if extra:
            origins.extend([o.strip() for o in extra.split(",") if o.strip()])
        return list(dict.fromkeys(origins))

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT.lower() == "development"


settings = Settings()
