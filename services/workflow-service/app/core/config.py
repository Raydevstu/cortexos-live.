from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="CORTEX_WORKFLOW_", extra="ignore")

    service_name: str = "workflow-service"
    environment: str = "development"
    host: str = "0.0.0.0"
    port: int = 8004

    temporal_address: str = "localhost:7233"
    temporal_connect_timeout_seconds: float = 3.0

    jarvis_service_url: str = "http://localhost:8005"
    studio_service_url: str = "http://localhost:8003"
    provider_service_url: str = "http://localhost:8002"
    librarian_service_url: str = "http://localhost:8001"
    brain_service_url: str = "http://localhost:8000"

    default_organization_id: str = "org-cortex-default"


@lru_cache
def get_settings() -> Settings:
    return Settings()
