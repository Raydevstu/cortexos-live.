from __future__ import annotations

from fastapi import APIRouter

from .graph import router as graph_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(graph_router)
