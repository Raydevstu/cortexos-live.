from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cortexos_types import HealthCheckResponse

from app.api.v1 import api_v1_router
from app.api.v1.search import get_search_service
from app.core.config import get_settings
from app.core.telemetry import configure_logging, telemetry_middleware


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)
    await get_search_service().vector_store.ensure_collection()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="CortexOS Search Service",
        version=settings.service_version,
        description=(
            "Tri-Hybrid Search & Qdrant Semantic Memory service fusing "
            "Postgres Keyword + Qdrant Vector + Neo4j Graph retrieval."
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
        service = get_search_service()
        qdrant_ready = await service.vector_store.ensure_collection()
        return {
            "ready": True,
            "service": settings.service_name,
            "qdrantConnected": qdrant_ready,
            "fallbackEnabled": settings.use_in_memory_fallback,
        }

    app.include_router(api_v1_router)
    return app


app = create_app()
