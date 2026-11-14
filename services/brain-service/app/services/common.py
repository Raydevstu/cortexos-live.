from __future__ import annotations

import hashlib
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from cortexos_types.enums import OrganizationPlan, SecurityRole, UserStatus
from cortexos_types.security import PolicyEvaluationContext

from app.core.config import get_settings
from app.core.security import PolicyEvaluator, RequestContext
from app.models.audit import AuditLogModel
from app.models.event import EventModel
from app.models.organization import OrganizationModel
from app.models.user import UserModel
from app.repositories.project_repo import OrganizationRepository, UserRepository


def sha256_hex(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def authorize(
    evaluator: PolicyEvaluator,
    ctx: RequestContext,
    resource: str,
    action: str,
    project_id: str | None = None,
) -> None:
    decision = evaluator.evaluate(
        PolicyEvaluationContext(
            subject_id=ctx.subject_id,
            organization_id=ctx.organization_id,
            role=ctx.role,
            resource=resource,
            action=action,
            project_id=project_id,
        )
    )
    if not decision.allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=decision.reason or "Permission denied",
        )


async def ensure_tenant_bootstrap(
    session: AsyncSession,
    organization_id: str,
    actor_id: str,
) -> None:
    org_repo = OrganizationRepository(session)
    if await org_repo.get_by_id(organization_id) is None:
        await org_repo.create(
            OrganizationModel(
                id=organization_id,
                name="CortexOS Default Workspace",
                slug=f"org-{organization_id[:8]}",
                plan=OrganizationPlan.PRO.value,
                settings={},
                created_by=actor_id,
                updated_by=actor_id,
            )
        )

    user_repo = UserRepository(session)
    if await user_repo.get_by_id(actor_id) is None:
        settings = get_settings()
        email = (
            "owner@cortexos.local"
            if actor_id == settings.default_actor_id
            else f"actor-{actor_id[:8]}@cortexos.local"
        )
        await user_repo.create(
            UserModel(
                id=actor_id,
                email=email,
                name="CortexOS Operator",
                role=SecurityRole.OWNER.value,
                status=UserStatus.ACTIVE.value,
                preferences={},
                created_by=actor_id,
                updated_by=actor_id,
            )
        )


async def emit_outbox_event(
    session: AsyncSession,
    *,
    event_type: str,
    organization_id: str | None,
    project_id: str | None,
    object_id: str,
    payload: dict[str, Any],
) -> EventModel:
    event = EventModel(
        id=str(uuid.uuid4()),
        event_type=event_type,
        organization_id=organization_id,
        project_id=project_id,
        source="brain-service",
        idempotency_key=f"{event_type}:{object_id}:{uuid.uuid4().hex[:12]}",
        payload=payload,
    )
    session.add(event)
    await session.flush()
    return event


async def record_audit(
    session: AsyncSession,
    *,
    organization_id: str | None,
    entity_type: str,
    entity_id: str,
    action: str,
    changed_by: str,
    changes: dict[str, Any],
) -> AuditLogModel:
    audit = AuditLogModel(
        id=str(uuid.uuid4()),
        organization_id=organization_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        changed_by=changed_by,
        changes=changes,
    )
    session.add(audit)
    await session.flush()
    return audit
