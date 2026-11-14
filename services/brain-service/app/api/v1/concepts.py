from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cortexos_types import Concept, CreateConceptRequest

from app.core.db import get_db_session
from app.core.security import RequestContext, require_permission
from app.schemas.brain import ConceptListResponse
from app.services.knowledge_svc import KnowledgeService

router = APIRouter(prefix="/concepts", tags=["concepts"])


@router.post(
    "",
    response_model=Concept,
    status_code=status.HTTP_201_CREATED,
)
async def create_concept(
    payload: CreateConceptRequest,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "write")),
) -> Concept:
    return await KnowledgeService(session).create_concept(payload, ctx)


@router.get("", response_model=ConceptListResponse)
async def list_concepts(
    domain: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
) -> ConceptListResponse:
    return await KnowledgeService(session).list_concepts(
        ctx,
        domain=domain,
        limit=limit,
        offset=offset,
    )


@router.get("/{concept_id}", response_model=Concept)
async def get_concept(
    concept_id: str,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
) -> Concept:
    return await KnowledgeService(session).get_concept(concept_id, ctx)
