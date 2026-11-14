from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from cortexos_types import (
    Artifact,
    ArtifactVersion,
    CreateArtifactRequest,
    PaginatedResponse,
    UpdateArtifactRequest,
)
from cortexos_types.enums import ArtifactStatus, ArtifactType

from app.core.db import get_db_session
from app.core.security import RequestContext, require_permission
from app.services.artifact_svc import ArtifactService

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


@router.post(
    "",
    response_model=Artifact,
    status_code=status.HTTP_201_CREATED,
)
async def create_artifact(
    payload: CreateArtifactRequest,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("artifact", "write")),
) -> Artifact:
    return await ArtifactService(session).create_artifact(payload, ctx)


@router.get("", response_model=PaginatedResponse[Artifact])
async def list_artifacts(
    project_id: str | None = Query(default=None),
    artifact_type: ArtifactType | None = Query(default=None),
    status_filter: ArtifactStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("artifact", "read")),
) -> PaginatedResponse[Artifact]:
    return await ArtifactService(session).list_artifacts(
        ctx,
        project_id=project_id,
        artifact_type=artifact_type,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )


@router.get("/{artifact_id}", response_model=Artifact)
async def get_artifact(
    artifact_id: str,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("artifact", "read")),
) -> Artifact:
    return await ArtifactService(session).get_artifact(artifact_id, ctx)


@router.get("/{artifact_id}/versions", response_model=list[ArtifactVersion])
async def list_artifact_versions(
    artifact_id: str,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("artifact", "read")),
) -> list[ArtifactVersion]:
    return await ArtifactService(session).list_versions(artifact_id, ctx)


@router.patch("/{artifact_id}", response_model=Artifact)
async def update_artifact(
    artifact_id: str,
    payload: UpdateArtifactRequest,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("artifact", "write")),
) -> Artifact:
    return await ArtifactService(session).update_artifact(artifact_id, payload, ctx)


@router.delete("/{artifact_id}", response_model=Artifact)
async def delete_artifact(
    artifact_id: str,
    session: AsyncSession = Depends(get_db_session),
    ctx: RequestContext = Depends(require_permission("artifact", "write")),
) -> Artifact:
    return await ArtifactService(session).delete_artifact(artifact_id, ctx)
