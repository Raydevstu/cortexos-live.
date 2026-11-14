from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="CORTEX_JARVIS_",
        env_file=".env",
        extra="ignore",
    )

    service_name: str = "jarvis-service"
    service_version: str = "0.1.0"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"

    studio_service_url: str = "http://localhost:8004"
    workflow_service_url: str = "http://localhost:8005"
    provider_service_url: str = "http://localhost:8006"
    brain_service_url: str = "http://localhost:8001"
    librarian_service_url: str = "http://localhost:8002"

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
