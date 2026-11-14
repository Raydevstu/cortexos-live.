from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cortexos_types import HealthCheckResponse

from app.api.v1 import api_v1_router
from app.core.config import get_settings
from app.core.telemetry import configure_logging, telemetry_middleware


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="CortexOS Librarian Service",
        version=settings.service_version,
        description="Knowledge Steward service owning ingestion, classification, extraction, relationship linking, wiki generation, compounding intelligence, and MainBrain synchronization.",
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
        return {"ready": True, "service": settings.service_name}

    app.include_router(api_v1_router)
    return app


app = create_app()
