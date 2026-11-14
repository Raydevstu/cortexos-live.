from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from cortexos_types import HealthCheckResponse

from app.api.v1 import api_v1_router
from app.core.config import get_settings
from app.core.db import check_db_health, dispose_db
from app.core.telemetry import configure_logging, telemetry_middleware


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)
    yield
    await dispose_db()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="CortexOS Brain Service",
        version=settings.service_version,
        description="Canonical System of Record for Projects, Artifacts, Knowledge, Workflows, Events, and Audit Logs.",
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
        db_ok = await check_db_health()
        return HealthCheckResponse(
            service=settings.service_name,
            status="healthy" if db_ok else "degraded",
            version=settings.service_version,
            timestamp=datetime.now(timezone.utc),
            dependencies={"postgres": "healthy" if db_ok else "unhealthy"},
        )

    @app.get("/ready", tags=["system"])
    async def ready() -> JSONResponse:
        db_ok = await check_db_health()
        code = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
        return JSONResponse(
            status_code=code,
            content={"ready": db_ok, "service": settings.service_name},
        )

    app.include_router(api_v1_router)
    return app


app = create_app()
