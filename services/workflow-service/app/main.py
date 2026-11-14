from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.workflows import router as workflows_router
from app.core.config import get_settings
from app.runtime import TemporalRuntimeManager


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    manager = TemporalRuntimeManager(settings)
    await manager.connect_temporal()
    app.state.runtime_manager = manager
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="CortexOS Workflow Service (Temporal Runtime)",
        version="0.1.0",
        description="Temporal workflow control plane and workers hosting all 16 CortexOS workflows.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(workflows_router, prefix="/api/v1")

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "service": settings.service_name}

    @app.get("/ready", tags=["health"])
    async def ready() -> dict[str, object]:
        return app.state.runtime_manager.topology_summary()

    return app


app = create_app()
