from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from cortexos_types import (
    Artifact,
    ArtifactVersion,
    CreateArtifactRequest,
    PaginatedResponse,
    UpdateArtifactRequest,
)
from cortexos_types.enums import ArtifactStatus, ArtifactType, CortexEventType

from app.core.security import PolicyEvaluator, RequestContext
from app.models.artifact import ArtifactModel, ArtifactVersionModel
from app.repositories.artifact_repo import ArtifactRepository, ArtifactVersionRepository
from app.repositories.project_repo import ProjectRepository
from app.schemas.brain import model_to_artifact, model_to_artifact_version
from app.services.common import (
    authorize,
    emit_outbox_event,
    ensure_tenant_bootstrap,
    record_audit,
    sha256_hex,
)


class ArtifactService:
    def __init__(
        self,
        session: AsyncSession,
        evaluator: PolicyEvaluator | None = None,
    ) -> None:
        self.session = session
        self.repo = ArtifactRepository(session)
        self.version_repo = ArtifactVersionRepository(session)
        self.project_repo = ProjectRepository(session)
        self.evaluator = evaluator or PolicyEvaluator()

    async def create_artifact(
        self,
        payload: CreateArtifactRequest,
        ctx: RequestContext,
    ) -> Artifact:
        authorize(self.evaluator, ctx, "artifact", "write", project_id=payload.project_id)
        org_id = payload.organization_id or ctx.organization_id
        await ensure_tenant_bootstrap(self.session, org_id, ctx.subject_id)

        project = await self.project_repo.get_by_id(payload.project_id, organization_id=org_id)
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{payload.project_id}' not found",
            )

        checksum = (
            sha256_hex(payload.content)
            if payload.content
            else sha256_hex(f"{payload.project_id}:{payload.title}:{payload.version}")
        )
        artifact_type_val = (
            payload.artifact_type.value
            if hasattr(payload.artifact_type, "value")
            else str(payload.artifact_type)
        )
        content_uri = (
            payload.content_uri
            or f"minio://cortexos-artifacts/{payload.project_id}/{artifact_type_val}/{payload.version}"
        )

        model = ArtifactModel(
            organization_id=org_id,
            project_id=payload.project_id,
            artifact_type=artifact_type_val,
            title=payload.title.strip(),
            summary=payload.summary,
            version=payload.version,
            status=ArtifactStatus.DRAFT.value,
            content_uri=content_uri,
            checksum=checksum,
            tags=list(payload.tags),
            metadata_payload=dict(payload.metadata),
            created_by=ctx.subject_id,
            updated_by=ctx.subject_id,
        )
        created = await self.repo.create(model)

        await self.version_repo.create(
            ArtifactVersionModel(
                artifact_id=created.id,
                version=created.version,
                content_uri=content_uri,
                change_summary="Initial version",
                created_by=ctx.subject_id,
                updated_by=ctx.subject_id,
            )
        )

        await emit_outbox_event(
            self.session,
            event_type=CortexEventType.ARTIFACT_CREATED.value,
            organization_id=org_id,
            project_id=created.project_id,
            object_id=created.id,
            payload={
                "artifact_id": created.id,
                "project_id": created.project_id,
                "artifact_type": created.artifact_type,
                "version": created.version,
            },
        )
        await record_audit(
            self.session,
            organization_id=org_id,
            entity_type="artifact",
            entity_id=created.id,
            action="create",
            changed_by=ctx.subject_id,
            changes={"title": created.title, "version": created.version},
        )
        return model_to_artifact(created)

    async def get_artifact(self, artifact_id: str, ctx: RequestContext) -> Artifact:
        authorize(self.evaluator, ctx, "artifact", "read")
        row = await self.repo.get_by_id(artifact_id, organization_id=ctx.organization_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Artifact '{artifact_id}' not found",
            )
        return model_to_artifact(row)

    async def list_artifacts(
        self,
        ctx: RequestContext,
        *,
        project_id: str | None = None,
        artifact_type: ArtifactType | None = None,
        status_filter: ArtifactStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> PaginatedResponse[Artifact]:
        authorize(self.evaluator, ctx, "artifact", "read", project_id=project_id)
        rows, total = await self.repo.list_filtered(
            organization_id=ctx.organization_id,
            project_id=project_id,
            artifact_type=artifact_type.value if artifact_type else None,
            status=status_filter.value if status_filter else None,
            limit=limit,
            offset=offset,
        )
        return PaginatedResponse[Artifact](
            items=[model_to_artifact(r) for r in rows],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def list_versions(
        self,
        artifact_id: str,
        ctx: RequestContext,
    ) -> list[ArtifactVersion]:
        authorize(self.evaluator, ctx, "artifact", "read")
        await self.get_artifact(artifact_id, ctx)
        versions = await self.version_repo.list_for_artifact(artifact_id)
        return [model_to_artifact_version(v) for v in versions]

    async def update_artifact(
        self,
        artifact_id: str,
        payload: UpdateArtifactRequest,
        ctx: RequestContext,
    ) -> Artifact:
        action = (
            "approve"
            if payload.status == ArtifactStatus.APPROVED
            else "review"
            if payload.status == ArtifactStatus.REVIEW
            else "write"
        )
        authorize(self.evaluator, ctx, "artifact", action)

        row = await self.repo.get_by_id(artifact_id, organization_id=ctx.organization_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Artifact '{artifact_id}' not found",
            )

        next_status = (
            payload.status.value
            if hasattr(payload.status, "value")
            else payload.status or row.status
        )
        next_approved_by = payload.approved_by if payload.approved_by is not None else row.approved_by
        next_approved_at = payload.approved_at if payload.approved_at is not None else row.approved_at

        if next_status == ArtifactStatus.APPROVED.value and (
            not next_approved_by or next_approved_at is None
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Transitioning artifact to 'approved' requires both approved_by and approved_at",
            )

        updates: dict[str, object] = {"updated_by": ctx.subject_id}
        if payload.title is not None:
            updates["title"] = payload.title.strip()
        if payload.status is not None:
            updates["status"] = next_status
        if payload.version is not None:
            updates["version"] = payload.version
        if payload.summary is not None:
            updates["summary"] = payload.summary
        if payload.content_uri is not None:
            updates["content_uri"] = payload.content_uri
        if payload.checksum is not None:
            updates["checksum"] = payload.checksum
        if payload.approved_by is not None:
            updates["approved_by"] = payload.approved_by
        if payload.approved_at is not None:
            updates["approved_at"] = payload.approved_at
        if payload.tags is not None:
            updates["tags"] = list(payload.tags)
        if payload.metadata is not None:
            updates["metadata_payload"] = dict(payload.metadata)

        previous_version = row.version
        updated = await self.repo.update(row, updates)

        if payload.version is not None and payload.version != previous_version:
            await self.version_repo.create(
                ArtifactVersionModel(
                    artifact_id=updated.id,
                    version=updated.version,
                    content_uri=updated.content_uri or "",
                    change_summary=f"Updated to version {updated.version}",
                    created_by=ctx.subject_id,
                    updated_by=ctx.subject_id,
                )
            )

        event_type = (
            CortexEventType.ARTIFACT_APPROVED.value
            if next_status == ArtifactStatus.APPROVED.value
            else CortexEventType.ARTIFACT_UPDATED.value
        )
        await emit_outbox_event(
            self.session,
            event_type=event_type,
            organization_id=updated.organization_id,
            project_id=updated.project_id,
            object_id=updated.id,
            payload={
                "artifact_id": updated.id,
                "project_id": updated.project_id,
                "status": updated.status,
                "version": updated.version,
            },
        )
        await record_audit(
            self.session,
            organization_id=updated.organization_id,
            entity_type="artifact",
            entity_id=updated.id,
            action="update",
            changed_by=ctx.subject_id,
            changes={"status": updated.status, "version": updated.version},
        )
        return model_to_artifact(updated)

    async def delete_artifact(self, artifact_id: str, ctx: RequestContext) -> Artifact:
        authorize(self.evaluator, ctx, "artifact", "write")
        row = await self.repo.get_by_id(artifact_id, organization_id=ctx.organization_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Artifact '{artifact_id}' not found",
            )
        deleted = await self.repo.delete(artifact_id, deleted_by=ctx.subject_id)
        assert deleted is not None
        await record_audit(
            self.session,
            organization_id=deleted.organization_id,
            entity_type="artifact",
            entity_id=deleted.id,
            action="soft_delete",
            changed_by=ctx.subject_id,
            changes={"deleted_at": deleted.deleted_at.isoformat() if deleted.deleted_at else None},
        )
        return model_to_artifact(deleted)
