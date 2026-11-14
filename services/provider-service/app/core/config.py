from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="CORTEX_PROVIDER_",
        env_file=".env",
        extra="ignore",
    )

    service_name: str = "provider-service"
    service_version: str = "0.1.0"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"

    # Optional provider credentials & endpoints (injected via environment at runtime)
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"

    anthropic_api_key: str | None = None
    anthropic_base_url: str = "https://api.anthropic.com/v1"

    gemini_api_key: str | None = None
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"

    grok_api_key: str | None = None
    grok_base_url: str = "https://api.x.ai/v1"

    deepseek_api_key: str | None = None
    deepseek_base_url: str = "https://api.deepseek.com/v1"

    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    ollama_base_url: str = "http://localhost:11434"
    lmstudio_base_url: str = "http://localhost:1234/v1"

    azure_openai_api_key: str | None = None
    azure_openai_endpoint: str | None = None

    allow_local_simulation: bool = True
    circuit_breaker_threshold: int = 2
    request_timeout_seconds: float = 30.0

    default_organization_id: str = "00000000-0000-0000-0000-000000000001"
    default_actor_id: str = "00000000-0000-0000-0000-000000000002"
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"]
    )
    enforce_auth: bool = False
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
