from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from cortexos_types import (
    CreateProjectRequest,
    CreateProjectResponse,
    Project,
    UpdateProjectRequest,
)
from cortexos_types.enums import CortexEventType, ProjectPhase, ProjectStatus

from app.core.security import PolicyEvaluator, RequestContext
from app.models.project import ProjectModel
from app.repositories.project_repo import ProjectRepository
from app.schemas.brain import ProjectListResponse, model_to_project
from app.services.common import (
    authorize,
    emit_outbox_event,
    ensure_tenant_bootstrap,
    record_audit,
)


class ProjectService:
    def __init__(
        self,
        session: AsyncSession,
        evaluator: PolicyEvaluator | None = None,
    ) -> None:
        self.session = session
        self.repo = ProjectRepository(session)
        self.evaluator = evaluator or PolicyEvaluator()

    async def create_project(
        self,
        payload: CreateProjectRequest,
        ctx: RequestContext,
    ) -> CreateProjectResponse:
        authorize(self.evaluator, ctx, "project", "write")
        org_id = payload.organization_id or ctx.organization_id
        await ensure_tenant_bootstrap(self.session, org_id, ctx.subject_id)

        name = payload.name.strip()
        if not name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Project name cannot be empty",
            )

        model = ProjectModel(
            organization_id=org_id,
            name=name,
            description=payload.description.strip(),
            status=ProjectStatus.DRAFT.value,
            phase=(payload.phase or ProjectPhase.DISCOVERY).value,
            owner_id=ctx.subject_id,
            vision=payload.vision,
            tags=list(payload.tags),
            metadata_payload=dict(payload.metadata),
            created_by=ctx.subject_id,
            updated_by=ctx.subject_id,
        )
        created = await self.repo.create(model)

        await emit_outbox_event(
            self.session,
            event_type=CortexEventType.PROJECT_CREATED.value,
            organization_id=org_id,
            project_id=created.id,
            object_id=created.id,
            payload={
                "project_id": created.id,
                "name": created.name,
                "phase": created.phase,
                "status": created.status,
            },
        )
        await record_audit(
            self.session,
            organization_id=org_id,
            entity_type="project",
            entity_id=created.id,
            action="create",
            changed_by=ctx.subject_id,
            changes={"name": created.name, "phase": created.phase, "status": created.status},
        )

        dto = model_to_project(created)
        return CreateProjectResponse(
            id=dto.id,
            status=dto.status,
            phase=dto.phase,
            project=dto,
        )

    async def get_project(self, project_id: str, ctx: RequestContext) -> Project:
        authorize(self.evaluator, ctx, "project", "read", project_id=project_id)
        row = await self.repo.get_by_id(project_id, organization_id=ctx.organization_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' not found",
            )
        return model_to_project(row)

    async def list_projects(
        self,
        ctx: RequestContext,
        *,
        status_filter: ProjectStatus | None = None,
        phase_filter: ProjectPhase | None = None,
        query: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> ProjectListResponse:
        authorize(self.evaluator, ctx, "project", "read")
        if query:
            rows = await self.repo.search(
                query,
                organization_id=ctx.organization_id,
                limit=limit,
            )
            items = [model_to_project(r) for r in rows]
            return ProjectListResponse(
                items=items,
                total=len(items),
                limit=limit,
                offset=offset,
            )

        rows, total = await self.repo.list_by_status_or_phase(
            organization_id=ctx.organization_id,
            status=status_filter.value if status_filter else None,
            phase=phase_filter.value if phase_filter else None,
            limit=limit,
            offset=offset,
        )
        return ProjectListResponse(
            items=[model_to_project(r) for r in rows],
            total=total,
            limit=limit,
            offset=offset,
        )

    async def update_project(
        self,
        project_id: str,
        payload: UpdateProjectRequest,
        ctx: RequestContext,
    ) -> Project:
        authorize(self.evaluator, ctx, "project", "write", project_id=project_id)
        row = await self.repo.get_by_id(project_id, organization_id=ctx.organization_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' not found",
            )

        updates: dict[str, object] = {"updated_by": ctx.subject_id}
        if payload.name is not None:
            updates["name"] = payload.name.strip()
        if payload.description is not None:
            updates["description"] = payload.description.strip()
        if payload.status is not None:
            updates["status"] = payload.status.value if hasattr(payload.status, "value") else payload.status
        if payload.phase is not None:
            updates["phase"] = payload.phase.value if hasattr(payload.phase, "value") else payload.phase
        if payload.vision is not None:
            updates["vision"] = payload.vision
        if payload.tags is not None:
            updates["tags"] = list(payload.tags)
        if payload.metadata is not None:
            updates["metadata_payload"] = dict(payload.metadata)

        previous_phase = row.phase
        updated = await self.repo.update(row, updates)

        event_type = (
            CortexEventType.PROJECT_PHASE_ADVANCED.value
            if payload.phase is not None and updated.phase != previous_phase
            else CortexEventType.PROJECT_UPDATED.value
        )
        await emit_outbox_event(
            self.session,
            event_type=event_type,
            organization_id=updated.organization_id,
            project_id=updated.id,
            object_id=updated.id,
            payload={
                "project_id": updated.id,
                "phase": updated.phase,
                "status": updated.status,
            },
        )
        await record_audit(
            self.session,
            organization_id=updated.organization_id,
            entity_type="project",
            entity_id=updated.id,
            action="update",
            changed_by=ctx.subject_id,
            changes={k: v for k, v in updates.items() if k != "updated_by"},
        )
        return model_to_project(updated)

    async def delete_project(self, project_id: str, ctx: RequestContext) -> Project:
        authorize(self.evaluator, ctx, "project", "write", project_id=project_id)
        row = await self.repo.get_by_id(project_id, organization_id=ctx.organization_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project '{project_id}' not found",
            )
        deleted = await self.repo.delete(project_id, deleted_by=ctx.subject_id)
        assert deleted is not None
        await record_audit(
            self.session,
            organization_id=deleted.organization_id,
            entity_type="project",
            entity_id=deleted.id,
            action="soft_delete",
            changed_by=ctx.subject_id,
            changes={"deleted_at": deleted.deleted_at.isoformat() if deleted.deleted_at else None},
        )
        return model_to_project(deleted)
