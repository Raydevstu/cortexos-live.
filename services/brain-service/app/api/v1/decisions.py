from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cortexos_types import CreateDecisionRequest, Decision

from app.core.db import get_db_session
from app.core.security import RequestContext, require_permission
from app.schemas.brain import DecisionListResponse
from app.services.knowledge_svc import KnowledgeService

router = APIRouter(prefix="/decisions", tags=["decisions"])


@router.post(
    "",
    response_model=Decision,
    status_code=status.HTTP_201_CREATED,
)
async def create_decision(
    payload: CreateDecisionRequest,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "write")),
) -> Decision:
    return await KnowledgeService(session).create_decision(payload, ctx)


@router.get("", response_model=DecisionListResponse)
async def list_decisions(
    project_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
) -> DecisionListResponse:
    return await KnowledgeService(session).list_decisions(
        ctx,
        project_id=project_id,
        limit=limit,
        offset=offset,
    )


@router.get("/{decision_id}", response_model=Decision)
async def get_decision(
    decision_id: str,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
) -> Decision:
    return await KnowledgeService(session).get_decision(decision_id, ctx)
