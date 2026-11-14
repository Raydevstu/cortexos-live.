from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cortexos_types import (
    CreateProjectRequest,
    CreateProjectResponse,
    Project,
    UpdateProjectRequest,
)
from cortexos_types.enums import ProjectPhase, ProjectStatus

from app.core.db import get_db_session
from app.core.security import RequestContext, require_permission
from app.schemas.brain import ProjectListResponse
from app.services.project_svc import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post(
    "",
    response_model=CreateProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_project(
    payload: CreateProjectRequest,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("project", "write")),
) -> CreateProjectResponse:
    return await ProjectService(session).create_project(payload, ctx)


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    status_filter: ProjectStatus | None = Query(default=None, alias="status"),
    phase: ProjectPhase | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("project", "read")),
) -> ProjectListResponse:
    return await ProjectService(session).list_projects(
        ctx,
        status_filter=status_filter,
        phase_filter=phase,
        query=q,
        limit=limit,
        offset=offset,
    )


@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("project", "read")),
) -> Project:
    return await ProjectService(session).get_project(project_id, ctx)


@router.patch("/{project_id}", response_model=Project)
async def update_project(
    project_id: str,
    payload: UpdateProjectRequest,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("project", "write")),
) -> Project:
    return await ProjectService(session).update_project(project_id, payload, ctx)


@router.delete("/{project_id}", response_model=Project)
async def delete_project(
    project_id: str,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("project", "write")),
) -> Project:
    return await ProjectService(session).delete_project(project_id, ctx)
