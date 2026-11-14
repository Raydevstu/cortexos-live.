from __future__ import annotations

from fastapi import APIRouter

from .search import router as search_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(search_router)
