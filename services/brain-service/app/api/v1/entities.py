from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cortexos_types import CreateEntityRequest, Entity

from app.core.db import get_db_session
from app.core.security import RequestContext, require_permission
from app.schemas.brain import EntityListResponse
from app.services.knowledge_svc import KnowledgeService

router = APIRouter(prefix="/entities", tags=["entities"])


@router.post(
    "",
    response_model=Entity,
    status_code=status.HTTP_201_CREATED,
)
async def create_entity(
    payload: CreateEntityRequest,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "write")),
) -> Entity:
    return await KnowledgeService(session).create_entity(payload, ctx)


@router.get("", response_model=EntityListResponse)
async def list_entities(
    entity_type: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
) -> EntityListResponse:
    return await KnowledgeService(session).list_entities(
        ctx,
        entity_type=entity_type,
        limit=limit,
        offset=offset,
    )


@router.get("/{entity_id}", response_model=Entity)
async def get_entity(
    entity_id: str,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
) -> Entity:
    return await KnowledgeService(session).get_entity(entity_id, ctx)
