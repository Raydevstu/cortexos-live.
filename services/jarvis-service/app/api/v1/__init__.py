from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.jarvis import router as jarvis_router
from app.core.config import get_settings

api_v1_router = APIRouter(prefix=get_settings().api_v1_prefix)
api_v1_router.include_router(jarvis_router)
