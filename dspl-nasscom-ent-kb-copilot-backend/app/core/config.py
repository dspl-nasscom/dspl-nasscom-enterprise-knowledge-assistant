"""Application-wide configuration loaded from .env via Pydantic BaseSettings."""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ── Application ────────────────────────────────────────────────────────────
    app_env: str = "development"
    log_env: str = "production"
    log_level: str = "info"

    # ── LLM ───────────────────────────────────────────────────────────────────
    llm_provider: str = "gemini"   # "gemini" | "ollama" | "openai"
    gemini_api_key: str = ""
    openai_api_key: str = ""
    llm_model: str = "gemini-2.5-flash"
    ollama_base_url: str = "http://localhost:11434"

    # ── Embeddings & Reranker ─────────────────────────────────────────────────
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    reranker_model: str = "BAAI/bge-reranker-base"
    top_k_retrieve: int = 20
    top_n_rerank: int = 5
    confidence_threshold: float = 0.4

    # ── Google Cloud (shared project for GCS + Firestore) ─────────────────────
    gcs_bucket_name: str = ""
    google_application_credentials: str = ""
    firestore_project: str = ""   # GCP project ID; leave empty to use ADC default
    pii_masking_enabled: bool = True

    # ── Vector Store ──────────────────────────────────────────────────────────
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    qdrant_collection: str = "kb_copilot"

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: List[str] | str = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v):
        """Allow CORS_ORIGINS to be a comma-separated string in .env."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Singleton settings — cached after first call."""
    return Settings()


# Module-level singleton for convenience
settings = get_settings()
