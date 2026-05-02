"""
=============================================================================
CodeForge AI — Application Configuration
=============================================================================

This module loads all configuration from environment variables.
Uses pydantic-settings for type-safe config with automatic .env loading.

Usage:
    from app.config import settings
    print(settings.MONGODB_URL)

=============================================================================
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    All application settings loaded from environment variables.
    If a variable is missing, the default value is used.
    Required fields (no default) will raise an error on startup if missing.
    """

    # ── Server ────────────────────────────────────────────────────────────────
    PORT: int = 9000
    FRONTEND_URL: str = "http://localhost:5173"
    APP_URL: str = "http://localhost:9000"

    # ── Security ──────────────────────────────────────────────────────────────
    SESSION_SECRET: str = "change-this-to-a-real-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 30

    # ── AI ────────────────────────────────────────────────────────────────────
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    DEFAULT_MODEL: str = "mistralai/mistral-7b-instruct:free"

    # Available free models on OpenRouter
    FREE_MODELS: list[dict] = [
        {"id": "mistralai/mistral-7b-instruct:free", "label": "Mistral 7B", "context": 32768},
        {"id": "meta-llama/llama-3-8b-instruct:free", "label": "Llama 3 8B", "context": 8192},
        {"id": "microsoft/phi-3-mini-128k-instruct:free", "label": "Phi-3 Mini", "context": 131072},
        {"id": "google/gemma-3-12b-it:free", "label": "Gemma 3 12B", "context": 131072},
    ]

    # ── Database: MongoDB ─────────────────────────────────────────────────────
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "codeforge"

    # ── Vector Store: Qdrant ──────────────────────────────────────────────────
    QDRANT_URL: str = ""          # Empty = use in-memory mode
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "codeforge_repos"

    # ── GitHub OAuth ──────────────────────────────────────────────────────────
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # ── Tavily Web Search ─────────────────────────────────────────────────────
    TAVILY_API_KEY: str = ""

    # ── Twilio (WhatsApp + Instagram) ─────────────────────────────────────────
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = ""
    TWILIO_INSTAGRAM_FROM: str = ""

    # Pydantic settings: automatically load from .env file
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore extra env vars not defined here
    )


# Single global settings instance — import this everywhere
settings = Settings()
