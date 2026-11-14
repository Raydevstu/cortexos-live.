from __future__ import annotations

from fastapi import APIRouter

from .providers import router as providers_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(providers_router)
