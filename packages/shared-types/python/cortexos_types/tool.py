from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ToolCategory(str, Enum):
    GITHUB = "github"
    FILESYSTEM = "filesystem"
    DOCUMENTATION = "documentation"
    TERMINAL = "terminal"


class ToolAccessMode(str, Enum):
    READ = "read"
    WRITE = "write"
    EXECUTE = "execute"


class ToolExecutionStatus(str, Enum):
    COMPLETED = "completed"
    FAILED = "failed"
    DENIED = "denied"


class ToolManifestSpec(BaseModel):
    name: str
    category: ToolCategory
    access_mode: ToolAccessMode
    version: str = "1.0.0"
    description: str
    allowed_studios: list[str] = Field(default_factory=list)
    requires_sandbox_isolation: bool = True
    emits_artifact: bool = True
    input_fields: list[str] = Field(default_factory=list)


class ToolPermissionResult(BaseModel):
    allowed: bool
    reason: str
    sandbox_root: str
    resolved_path: str | None = None
    denied_rule: str | None = None


class ToolExecutionRequest(BaseModel):
    tool_name: str
    agent_id: str
    studio_id: str
    project_id: str
    work_request_id: str | None = None
    workflow_id: str | None = None
    actor_id: str | None = None
    parameters: dict[str, Any] = Field(default_factory=dict)


class ToolExecutionRecord(BaseModel):
    id: str
    tool_name: str
    category: ToolCategory
    agent_id: str
    studio_id: str
    project_id: str
    work_request_id: str | None = None
    workflow_id: str | None = None
    status: ToolExecutionStatus
    started_at: datetime
    completed_at: datetime
    duration_ms: float
    input_summary: str
    result_summary: str
    output: dict[str, Any] = Field(default_factory=dict)
    artifact_id: str | None = None
    artifact_title: str | None = None
    knowledge_candidate_title: str | None = None
    audit_entry_id: str
    checksum: str
    sandbox_root: str


class ToolAuditEntry(BaseModel):
    id: str
    execution_id: str
    tool_name: str
    category: ToolCategory
    agent_id: str
    studio_id: str
    project_id: str
    action: str
    allowed: bool
    reason: str
    checksum: str
    timestamp: datetime
    details: dict[str, Any] = Field(default_factory=dict)
