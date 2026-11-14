from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="CORTEX_BRAIN_",
        env_file=".env",
        extra="ignore",
    )

    service_name: str = "brain-service"
    service_version: str = "0.1.0"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str = Field(
        default="postgresql+asyncpg://cortexos:cortexos@localhost:5432/cortexos_brain",
    )
    sync_database_url: str = Field(
        default="postgresql+psycopg://cortexos:cortexos@localhost:5432/cortexos_brain",
    )
    sql_echo: bool = False
    db_pool_size: int = 10
    db_max_overflow: int = 20

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
