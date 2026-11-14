from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cortexos_types import HealthCheckResponse

from app.api.v1 import api_v1_router
from app.api.v1.providers import get_provider_registry
from app.core.config import get_settings
from app.core.telemetry import configure_logging, telemetry_middleware


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)
    registry = get_provider_registry()
    for pid in registry.ordered_provider_ids():
        adapter = registry.get_adapter(pid)
        if adapter:
            await adapter.connect()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="CortexOS Provider Service",
        version=settings.service_version,
        description=(
            "Unified Multi-Provider Model Registry, Capability Router, Health Monitor, "
            "Automatic Failover, and Token/Cost Tracking service."
        ),
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.middleware("http")(telemetry_middleware)

    @app.get("/health", response_model=HealthCheckResponse, tags=["system"])
    async def health() -> HealthCheckResponse:
        return HealthCheckResponse(
            service=settings.service_name,
            status="healthy",
            version=settings.service_version,
            timestamp=datetime.now(timezone.utc),
        )

    @app.get("/ready", tags=["system"])
    async def ready() -> dict[str, object]:
        providers = await get_provider_registry().list_providers()
        healthy_count = sum(1 for p in providers if p.healthy)
        return {
            "ready": healthy_count > 0,
            "service": settings.service_name,
            "registeredProviders": len(providers),
            "healthyProviders": healthy_count,
        }

    app.include_router(api_v1_router)
    return app


app = create_app()
