from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import Field

from cortexos_types import (
    Agent,
    AgentCouncilReport,
    ApprovalDecisionRequest,
    CortexEvent,
    CortexModel,
    JarvisProjectState,
    StudioHandoffRequest,
    WorkRequest,
    WorkResponse,
)
from cortexos_types.enums import ProjectPhase, StudioId


class StudioAssignmentDecision(CortexModel):
    studio_id: StudioId | str
    agent_id: str
    reason: str
    preferred_provider: str = "anthropic"
    preferred_model: str = "claude-sonnet-4"
    context_artifact_ids: list[str] = Field(default_factory=list)


class AgentMeshMessage(CortexModel):
    id: str
    project_id: str
    from_agent: str
    to_agent: str
    via_jarvis: bool = True
    message_type: str = "handoff"
    summary: str
    artifact_ids: list[str] = Field(default_factory=list)
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RiskItem(CortexModel):
    id: str
    severity: str
    category: str
    description: str
    mitigation: str
    source_entity_id: str | None = None


class RiskAssessmentReport(CortexModel):
    project_id: str
    risk_score: int
    status: str
    risks: list[RiskItem] = Field(default_factory=list)
    evaluated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PendingApprovalRecord(CortexModel):
    id: str
    project_id: str
    workflow_id: str
    artifact_id: str | None = None
    phase: ProjectPhase | str
    requested_by: str
    reason: str
    status: str = "pending"
    decided_by: str | None = None
    feedback: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    decided_at: datetime | None = None


class CouncilConveneRequest(CortexModel):
    project_id: str
    objective: str
    studios: list[str] = Field(default_factory=list)


class WorkDispatchResult(CortexModel):
    work_request: WorkRequest
    work_response: WorkResponse
    assignment: StudioAssignmentDecision
    workflow_id: str
    events: list[CortexEvent] = Field(default_factory=list)


class AgentRuntimeTelemetry(CortexModel):
    agent: Agent
    current_artifact: str = ""
    current_workflow: str = ""
    provider: str = "anthropic"
    runtime_state: str = "idle"
    last_decision: str = ""


class JarvisPresenceSnapshot(CortexModel):
    project_state: JarvisProjectState
    agents: list[AgentRuntimeTelemetry]
    recent_events: list[CortexEvent]
    pending_approvals: list[ApprovalDecisionRequest]
    risk_report: RiskAssessmentReport
    last_council: AgentCouncilReport | None = None
    mesh_messages: list[AgentMeshMessage] = Field(default_factory=list)
    handoffs: list[StudioHandoffRequest] = Field(default_factory=list)
