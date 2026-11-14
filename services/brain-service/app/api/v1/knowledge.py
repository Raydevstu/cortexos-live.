from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cortexos_types import (
    AuditLog,
    Doctrine,
    Pattern,
    Relationship,
    StoredEvent,
    Workflow,
)

from app.core.db import get_db_session
from app.core.security import RequestContext, require_permission
from app.schemas.brain import (
    CreateDoctrineRequest,
    CreatePatternRequest,
    CreateRelationshipRequest,
    CreateWorkflowRequest,
    DoctrineListResponse,
    PatternListResponse,
    RelationshipListResponse,
    WorkflowListResponse,
)
from app.services.knowledge_svc import KnowledgeService

router = APIRouter(tags=["knowledge-and-governance"])


@router.post(
    "/patterns",
    response_model=Pattern,
    status_code=status.HTTP_201_CREATED,
)
async def create_pattern(
    payload: CreatePatternRequest,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "write")),
) -> Pattern:
    return await KnowledgeService(session).create_pattern(payload, ctx)


@router.get("/patterns", response_model=PatternListResponse)
async def list_patterns(
    category: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
) -> PatternListResponse:
    return await KnowledgeService(session).list_patterns(
        ctx,
        category=category,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/doctrines",
    response_model=Doctrine,
    status_code=status.HTTP_201_CREATED,
)
async def create_doctrine(
    payload: CreateDoctrineRequest,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "write")),
) -> Doctrine:
    return await KnowledgeService(session).create_doctrine(payload, ctx)


@router.get("/doctrines", response_model=DoctrineListResponse)
async def list_doctrines(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
) -> DoctrineListResponse:
    return await KnowledgeService(session).list_doctrines(ctx, limit=limit, offset=offset)


@router.post(
    "/relationships",
    response_model=Relationship,
    status_code=status.HTTP_201_CREATED,
)
async def create_relationship(
    payload: CreateRelationshipRequest,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "write")),
) -> Relationship:
    return await KnowledgeService(session).create_relationship(payload, ctx)


@router.get("/relationships", response_model=RelationshipListResponse)
async def list_relationships(
    node_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
) -> RelationshipListResponse:
    return await KnowledgeService(session).list_relationships(
        ctx,
        node_id=node_id,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/workflows",
    response_model=Workflow,
    status_code=status.HTTP_201_CREATED,
)
async def create_workflow(
    payload: CreateWorkflowRequest,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("workflow", "start")),
) -> Workflow:
    return await KnowledgeService(session).create_workflow(payload, ctx)


@router.get("/workflows", response_model=WorkflowListResponse)
async def list_workflows(
    project_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("workflow", "read")),
) -> WorkflowListResponse:
    return await KnowledgeService(session).list_workflows(
        ctx,
        project_id=project_id,
        limit=limit,
        offset=offset,
    )


@router.get("/events", response_model=list[StoredEvent])
async def list_events(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("project", "read")),
) -> list[StoredEvent]:
    return await KnowledgeService(session).list_events(ctx, limit=limit, offset=offset)


@router.get("/audit-logs", response_model=list[AuditLog])
async def list_audit_logs(
    entity_type: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("project", "read")),
) -> list[AuditLog]:
    return await KnowledgeService(session).list_audit_logs(
        ctx,
        entity_type=entity_type,
        limit=limit,
        offset=offset,
    )
