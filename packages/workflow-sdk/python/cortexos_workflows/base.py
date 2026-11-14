from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import Field

from cortexos_types import CortexModel
from cortexos_types.enums import TemporalNamespace, TemporalTaskQueue, WorkflowStatus, WorkflowType


class WorkflowStepResult(CortexModel):
    step: str
    status: str = "completed"
    output: dict[str, Any] = Field(default_factory=dict)
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WorkflowContext(CortexModel):
    workflow_id: str
    workflow_type: WorkflowType | str
    project_id: str
    namespace: TemporalNamespace = TemporalNamespace.SYSTEM
    task_queue: TemporalTaskQueue = TemporalTaskQueue.JARVIS_SYSTEM
    status: WorkflowStatus = WorkflowStatus.PENDING
    current_step: str = "initialized"
    input: dict[str, Any] = Field(default_factory=dict)
    result: dict[str, Any] = Field(default_factory=dict)
    steps: list[WorkflowStepResult] = Field(default_factory=list)
    temporal_run_id: str | None = None
    error: str | None = None


class CortexWorkflow:
    workflow_id: str = ""
    name: str = ""

    async def start(self):
        raise NotImplementedError

    async def execute(self):
        raise NotImplementedError

    async def monitor(self):
        raise NotImplementedError

    async def recover(self):
        raise NotImplementedError

    async def complete(self):
        raise NotImplementedError

    async def rollback(self):
        raise NotImplementedError

    async def fail(self):
        raise NotImplementedError


class Activity:
    activity_id: str = ""

    async def execute(self):
        raise NotImplementedError

    async def validate(self):
        raise NotImplementedError

    async def audit(self):
        raise NotImplementedError

    async def report(self):
        raise NotImplementedError
