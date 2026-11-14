from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_studios_dir() -> str:
    # /services/studio-service/app/core/config.py -> repo root / studios
    candidate = Path(__file__).resolve().parents[4] / "studios"
    return str(candidate)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="CORTEX_STUDIO_",
        env_file=".env",
        extra="ignore",
    )

    service_name: str = "studio-service"
    service_version: str = "0.1.0"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"

    studios_dir: str = Field(default_factory=_default_studios_dir)

    brain_service_url: str = "http://localhost:8001"
    librarian_service_url: str = "http://localhost:8002"
    search_service_url: str = "http://localhost:8004"
    provider_service_url: str = "http://localhost:8005"

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
