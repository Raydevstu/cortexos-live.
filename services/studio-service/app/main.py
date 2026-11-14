from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cortexos_types import HealthCheckResponse

from app.api.v1 import api_v1_router
from app.api.v1.studios import get_studio_runtime
from app.core.config import get_settings
from app.core.telemetry import configure_logging, telemetry_middleware


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)
    runtime = get_studio_runtime()
    await runtime.bootstrap()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="CortexOS Studio Runtime",
        version=settings.service_version,
        description=(
            "Studio Registry, Studio Loader, 6-Layer Context Stack Builder, "
            "Studio Runtime Execution, Artifact Lifecycle, and Jarvis Handoff API."
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
        runtime = get_studio_runtime()
        await runtime.bootstrap()
        profiles = runtime.list_studios()
        implemented_count = runtime.registry.count_implemented()
        return {
            "ready": implemented_count > 0,
            "service": settings.service_name,
            "discoveredStudios": len(profiles),
            "implementedStudios": implemented_count,
        }

    app.include_router(api_v1_router)
    return app


app = create_app()
