from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Server
    port: int = 9000
    frontend_url: str = "http://localhost:5173"
    app_url: str = "http://localhost:9000"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Security
    session_secret: str = "change-this-to-a-real-secret-min-32-chars-long"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 30

    # AI — OpenRouter
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    ai_model: str = "mistralai/mistral-7b-instruct:free"
    ai_temperature: float = 0.2
    max_tokens: int = 4096

    # AI — Groq
    groq_api_key: str = ""

    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db: str = "codeforge"

    # Qdrant
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_collection: str = "codeforge_repos"
    qdrant_vector_size: int = 384

    # GitHub OAuth
    github_client_id: str = ""
    github_client_secret: str = ""

    # Tavily
    tavily_api_key: str = ""

    # Twilio
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = ""
    twilio_instagram_from: str = ""

    # Aliases (uppercase access)
    @property
    def PORT(self): return self.port
    @property
    def FRONTEND_URL(self): return self.frontend_url
    @property
    def APP_URL(self): return self.app_url
    @property
    def SESSION_SECRET(self): return self.session_secret
    @property
    def JWT_ALGORITHM(self): return self.jwt_algorithm
    @property
    def JWT_EXPIRE_DAYS(self): return self.jwt_expire_days
    @property
    def OPENROUTER_API_KEY(self): return self.openrouter_api_key
    @property
    def OPENROUTER_BASE_URL(self): return self.openrouter_base_url
    @property
    def DEFAULT_MODEL(self): return self.ai_model
    @property
    def GROQ_API_KEY(self): return self.groq_api_key
    @property
    def MONGODB_URL(self): return self.mongodb_url
    @property
    def MONGODB_DB(self): return self.mongodb_db
    @property
    def QDRANT_URL(self): return self.qdrant_url
    @property
    def QDRANT_API_KEY(self): return self.qdrant_api_key
    @property
    def QDRANT_COLLECTION(self): return self.qdrant_collection
    @property
    def GITHUB_CLIENT_ID(self): return self.github_client_id
    @property
    def GITHUB_CLIENT_SECRET(self): return self.github_client_secret
    @property
    def TAVILY_API_KEY(self): return self.tavily_api_key
    @property
    def TWILIO_ACCOUNT_SID(self): return self.twilio_account_sid
    @property
    def TWILIO_AUTH_TOKEN(self): return self.twilio_auth_token
    @property
    def TWILIO_WHATSAPP_FROM(self): return self.twilio_whatsapp_from
    @property
    def TWILIO_INSTAGRAM_FROM(self): return self.twilio_instagram_from

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
