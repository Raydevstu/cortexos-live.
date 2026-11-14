from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field

from .base import CortexModel
from .enums import CortexEventType, EventDeliveryStatus


class CortexEvent(CortexModel):
    id: str
    type: CortexEventType | str
    timestamp: datetime
    source: str
    correlation_id: str | None = None
    organization_id: str | None = None
    project_id: str | None = None
    idempotency_key: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class ArtifactCreatedEventPayload(CortexModel):
    artifact_id: str
    project_id: str
    artifact_type: str


class KnowledgeCreatedEventPayload(CortexModel):
    knowledge_id: str
    knowledge_type: str


class AgentLifecycleEventPayload(CortexModel):
    agent_id: str
    studio_id: str | None = None
    work_request_id: str | None = None


class WorkflowCompletedEventPayload(CortexModel):
    workflow_id: str
    workflow_type: str
    project_id: str


class ProviderFailedEventPayload(CortexModel):
    provider: str
    model: str | None = None
    reason: str
    fallback_provider: str | None = None


class ApprovalRequiredEventPayload(CortexModel):
    workflow_id: str
    artifact_id: str
    project_id: str
    requested_by: str


class StoredEvent(CortexModel):
    id: str
    event_type: str
    payload: dict[str, Any] = Field(default_factory=dict)
    status: EventDeliveryStatus
    timestamp: datetime
    attempts: int | None = None


class AuditLog(CortexModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    changed_by: str
    created_at: datetime
    changes: dict[str, Any] | None = None
