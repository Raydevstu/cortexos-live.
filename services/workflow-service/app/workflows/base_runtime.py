from __future__ import annotations

from datetime import timedelta
from typing import Any

from cortexos_types.enums import WorkflowStatus, WorkflowType
from cortexos_workflows import CortexWorkflow, WorkflowContext, WorkflowStepResult

from app.clusters import resolve_route
from app.temporal_compat import RetryPolicy


DEFAULT_RETRY_POLICY = RetryPolicy(
    initial_interval=timedelta(seconds=1),
    backoff_coefficient=2.0,
    maximum_interval=timedelta(seconds=30),
    maximum_attempts=3,
)


class CortexTemporalWorkflowBase(CortexWorkflow):
    """Shared CortexWorkflow implementation bridging Temporal @workflow classes cleanly."""

    workflow_type: WorkflowType = WorkflowType.PROJECT_LIFECYCLE
    name: str = "CortexTemporalWorkflow"

    def __init__(self) -> None:
        self.context: WorkflowContext | None = None
        self.snapshots: list[dict[str, Any]] = []

    def init_context(self, project_id: str, workflow_id: str, payload: dict[str, Any]) -> WorkflowContext:
        namespace, task_queue = resolve_route(self.workflow_type)
        self.workflow_id = workflow_id
        self.context = WorkflowContext(
            workflow_id=workflow_id,
            workflow_type=self.workflow_type,
            project_id=project_id,
            namespace=namespace,
            task_queue=task_queue,
            status=WorkflowStatus.RUNNING,
            current_step="started",
            input=payload,
        )
        return self.context

    def record_step(self, step: str, output: dict[str, Any] | None = None, status: str = "completed") -> None:
        if self.context is None:
            return
        self.context.current_step = step
        self.context.steps.append(WorkflowStepResult(step=step, status=status, output=output or {}))
        self.snapshots.append({"step": step, "status": status, "output": output or {}})

    async def start(self, payload: dict[str, Any] | None = None) -> WorkflowContext:
        data = payload or {}
        project_id = str(data.get("project_id") or data.get("projectId") or "proj-default")
        workflow_id = str(data.get("workflow_id") or f"wf-{self.workflow_type.value.lower()}")
        return self.init_context(project_id, workflow_id, data)

    async def execute(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        return await self.run(payload or {})  # type: ignore[attr-defined]

    async def monitor(self) -> dict[str, Any]:
        if self.context is None:
            return {"status": WorkflowStatus.PENDING.value, "steps": []}
        return {
            "workflowId": self.context.workflow_id,
            "workflowType": str(self.context.workflow_type),
            "status": self.context.status.value,
            "currentStep": self.context.current_step,
            "steps": [s.model_dump(mode="json") for s in self.context.steps],
        }

    async def recover(self) -> dict[str, Any]:
        self.record_step("recovered", {"snapshotCount": len(self.snapshots)})
        if self.context is not None:
            self.context.status = WorkflowStatus.RUNNING
        return await self.monitor()

    async def complete(self, result: dict[str, Any] | None = None) -> dict[str, Any]:
        if self.context is not None:
            self.context.status = WorkflowStatus.COMPLETED
            self.context.current_step = "completed"
            self.context.result = result or {}
        return self.context.result if self.context is not None else (result or {})

    async def rollback(self) -> dict[str, Any]:
        self.record_step("rolled_back", {"reason": "compensated"})
        if self.context is not None:
            self.context.status = WorkflowStatus.ROLLED_BACK
        return await self.monitor()

    async def fail(self, error: str = "Workflow execution failed") -> dict[str, Any]:
        self.record_step("failed", {"error": error}, status="failed")
        if self.context is not None:
            self.context.status = WorkflowStatus.FAILED
            self.context.error = error
        return await self.monitor()
