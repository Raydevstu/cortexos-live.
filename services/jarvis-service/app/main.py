from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cortexos_types import HealthCheckResponse

from app.api.v1 import api_v1_router
from app.api.v1.jarvis import get_jarvis_engine
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="CortexOS Jarvis Runtime",
        version=settings.service_version,
        description=(
            "Jarvis Supervisor Engine, Project State & Phase Enforcement, Approval Gates, "
            "Risk Engine, WorkRequest Dispatcher, Agent Mesh Controller, Council Runtime, "
            "and Temporal Workflow Bridge."
        ),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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
        engine = get_jarvis_engine()
        agents = engine.state_engine.list_agents()
        return {
            "ready": len(agents) == 9,
            "service": settings.service_name,
            "registeredAgents": len(agents),
        }

    app.include_router(api_v1_router)
    return app


app = create_app()
