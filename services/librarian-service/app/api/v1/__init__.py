from __future__ import annotations

from fastapi import APIRouter

from .librarian import router as librarian_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(librarian_router)

__all__ = ["api_v1_router"]
