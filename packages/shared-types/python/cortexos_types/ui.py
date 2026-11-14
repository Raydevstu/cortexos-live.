from __future__ import annotations

from datetime import datetime

from .base import CortexModel
from .enums import (
    AgentStatus,
    NotificationSeverity,
    ProjectPhase,
    StudioId,
    TerminalMode,
    WorkspaceMode,
    WorkspaceState,
)


class AgentDockItem(CortexModel):
    id: str
    name: str
    status: AgentStatus
    workload: int
    current_task: str
    health_score: int
    last_artifact: str | None = None


class Workspace(CortexModel):
    id: str
    agent_id: str
    studio_id: str | None = None
    title: str
    state: WorkspaceState
    mode: WorkspaceMode | None = None


class TerminalSession(CortexModel):
    id: str
    provider: str
    model: str
    project_id: str
    mode: TerminalMode
    active_studio_id: str | None = None
    active_agent_id: str | None = None


class SystemNotification(CortexModel):
    id: str
    type: str
    severity: NotificationSeverity
    title: str
    message: str
    project_id: str | None = None
    artifact_id: str | None = None
    read: bool = False
    created_at: datetime


class ContextHeaderSummary(CortexModel):
    project_id: str
    project_name: str
    phase: ProjectPhase
    active_studio_count: int
    artifact_count: int
    knowledge_node_count: int


class AgentActivityItem(CortexModel):
    id: str
    agent_id: str
    agent_name: str
    studio_id: StudioId | str
    status: AgentStatus
    task: str
    artifact_id: str | None = None
    timestamp: datetime
