from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field

from .agent import Agent
from .artifact import Artifact
from .base import BaseEntity, CortexModel
from .enums import TemporalNamespace, TemporalTaskQueue, WorkflowStatus, WorkflowType


class Workflow(BaseEntity):
    organization_id: str | None = None
    project_id: str
    workflow_type: WorkflowType | str
    namespace: TemporalNamespace | None = None
    task_queue: TemporalTaskQueue | None = None
    status: WorkflowStatus | str
    current_step: str
    started_at: datetime
    completed_at: datetime | None = None
    temporal_run_id: str | None = None
    input: dict[str, Any] = Field(default_factory=dict)
    result: dict[str, Any] = Field(default_factory=dict)


class WorkflowExecution(BaseEntity):
    workflow_id: str
    execution_id: str
    status: WorkflowStatus | str
    started_at: datetime
    completed_at: datetime | None = None
    retry_count: int = 0
    error: str | None = None


class WorkflowStartRequest(CortexModel):
    project_id: str
    workflow_type: WorkflowType
    input: dict[str, Any] = Field(default_factory=dict)
    idempotency_key: str | None = None


class ApprovalDecisionRequest(CortexModel):
    workflow_id: str
    artifact_id: str | None = None
    approved: bool
    decided_by: str
    feedback: str | None = None


class AgentCouncilOpinion(CortexModel):
    agent_id: str
    studio_id: str
    opinion: str
    recommendation: str
    risk: str
    confidence: float


class AgentCouncilReport(CortexModel):
    id: str
    project_id: str
    objective: str
    opinions: list[AgentCouncilOpinion]
    consensus_summary: str
    decisions: list[str]
    risks: list[str]
    created_at: datetime


class WarRoomSnapshot(CortexModel):
    project_id: str
    active_workflows: list[Workflow]
    agents: list[Agent]
    council_opinions: list[AgentCouncilOpinion]
    pending_approvals: list[ApprovalDecisionRequest]
    risks: list[str]
    recent_artifacts: list[Artifact]
    updated_at: datetime
