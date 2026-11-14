from __future__ import annotations

from fastapi import APIRouter

from .artifacts import router as artifacts_router
from .concepts import router as concepts_router
from .decisions import router as decisions_router
from .entities import router as entities_router
from .knowledge import router as knowledge_router
from .projects import router as projects_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(projects_router)
api_v1_router.include_router(artifacts_router)
api_v1_router.include_router(entities_router)
api_v1_router.include_router(concepts_router)
api_v1_router.include_router(decisions_router)
api_v1_router.include_router(knowledge_router)

__all__ = ["api_v1_router"]
