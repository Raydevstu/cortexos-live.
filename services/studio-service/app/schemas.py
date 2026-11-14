from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field

from cortexos_types import (
    AgentMemory,
    Artifact,
    CortexModel,
    Studio,
    StudioManifest,
    TerminalContextStack,
)
from cortexos_types.enums import ArtifactStatus


class LoadedStudioProfile(CortexModel):
    studio: Studio
    manifest: StudioManifest
    role: str = "Specialist"
    implemented: bool = False
    agent_doc: str = ""
    mission_doc: str = ""
    knowledge_doc: str = ""
    constraints_doc: str = ""
    skills: list[str] = Field(default_factory=list)
    templates: list[str] = Field(default_factory=list)
    playbooks: list[str] = Field(default_factory=list)
    local_memory: list[AgentMemory] = Field(default_factory=list)


class StudioValidateResponse(CortexModel):
    studio_id: str
    artifact_id: str
    valid: bool
    criteria_checked: list[str] = Field(default_factory=list)


class StudioSummarizeResponse(CortexModel):
    studio_id: str
    project_id: str
    artifact_ids: list[str]
    summary: str


class StudioHandoffReceipt(CortexModel):
    handoff_id: str
    project_id: str
    from_studio_id: str
    to_studio_id: str
    artifact_ids: list[str]
    summary: str
    routed_via: str = "jarvis-agent-mesh"
    recorded_at: datetime


class ContextBuildRequest(CortexModel):
    project_id: str
    objective: str
    artifact_ids: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)


class ContextStackResponse(CortexModel):
    studio_id: str
    terminal_context_stack: TerminalContextStack
    local_memory_count: int = 0
    hydrated_artifact_count: int = 0


class ArtifactLifecycleRecord(CortexModel):
    artifact: Artifact
    current_stage: ArtifactStatus
    persisted_in_brain: bool = False
    ingested_by_librarian: bool = False
    stage_history: list[dict[str, Any]] = Field(default_factory=list)


class ArtifactTransitionRequest(CortexModel):
    target_status: ArtifactStatus
    reason: str | None = None

