from __future__ import annotations

from pydantic import Field

from .base import BaseEntity, CortexModel
from .enums import (
    AgentMemoryType,
    AgentStatus,
    ArtifactType,
    ProjectPhase,
    StudioStatus,
    WorkRequestPriority,
    WorkRequestStatus,
    WorkResponseStatus,
)


class StudioManifest(CortexModel):
    id: str
    name: str
    version: str
    mission: str
    capabilities: list[str]
    supported_artifacts: list[ArtifactType | str]
    tools: list[str]
    constraints: list[str]


class Studio(BaseEntity):
    name: str
    version: str
    mission: str
    enabled: bool
    status: StudioStatus
    manifest: StudioManifest | None = None


class Agent(BaseEntity):
    organization_id: str | None = None
    studio_id: str
    name: str
    role: str
    status: AgentStatus
    health_score: int
    current_task: str
    model_id: str | None = None


class AgentMemory(BaseEntity):
    agent_id: str
    project_id: str | None = None
    memory_type: AgentMemoryType
    content: str
    importance_score: float


class AgentContext(CortexModel):
    project_id: str
    workspace_id: str
    work_request_id: str
    memory_ids: list[str]
    artifact_ids: list[str]
    constraints: list[str]


class AgentResponse(CortexModel):
    success: bool
    summary: str
    artifact_ids: list[str]
    recommendations: list[str]
    blockers: list[str]


class WorkRequest(BaseEntity):
    organization_id: str | None = None
    project_id: str
    studio_id: str
    objective: str
    constraints: list[str] = Field(default_factory=list)
    success_criteria: list[str] = Field(default_factory=list)
    context_artifacts: list[str] = Field(default_factory=list)
    priority: WorkRequestPriority = WorkRequestPriority.MEDIUM
    status: WorkRequestStatus | None = None


class WorkResponse(CortexModel):
    id: str
    request_id: str
    studio_id: str
    status: WorkResponseStatus
    artifact_ids: list[str]
    summary: str
    next_recommended_phase: ProjectPhase | str | None = None


class CreateWorkRequest(CortexModel):
    organization_id: str | None = None
    project_id: str
    studio_id: str
    objective: str
    constraints: list[str] = Field(default_factory=list)
    success_criteria: list[str] = Field(default_factory=list)
    context_artifacts: list[str] = Field(default_factory=list)
    priority: WorkRequestPriority = WorkRequestPriority.MEDIUM


class AdvancePhaseRequest(CortexModel):
    project_id: str
    target_phase: ProjectPhase | None = None
    approved_by: str | None = None
    notes: str | None = None


class JarvisProjectState(CortexModel):
    project_id: str
    phase: ProjectPhase
    status: str
    active_work_requests: list[WorkRequest]
    active_agents: list[Agent]
    blocked_reasons: list[str]
    ready_for_next_phase: bool
    next_phase: ProjectPhase | None = None


class StudioExecuteRequest(CortexModel):
    work_request: WorkRequest
    context: AgentContext | None = None
    preferred_provider: str | None = None
    preferred_model: str | None = None


class StudioValidateRequest(CortexModel):
    artifact_id: str
    criteria: list[str] = Field(default_factory=list)


class StudioSummarizeRequest(CortexModel):
    project_id: str
    artifact_ids: list[str]


class StudioHandoffRequest(CortexModel):
    project_id: str
    from_studio_id: str
    to_studio_id: str
    artifact_ids: list[str]
    summary: str
