from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import httpx

from cortexos_types import Workflow, WorkflowStartRequest
from cortexos_types.enums import TemporalNamespace, TemporalTaskQueue, WorkflowStatus, WorkflowType

from app.core.config import Settings

logger = logging.getLogger(__name__)


class TemporalWorkflowBridge:
    """Connects Jarvis Runtime to Temporal workflows hosted by workflow-service."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._tracked_workflows: dict[str, Workflow] = {}

    async def start_workflow(
        self,
        *,
        project_id: str,
        workflow_type: WorkflowType,
        payload: dict[str, Any] | None = None,
        namespace: TemporalNamespace = TemporalNamespace.SYSTEM,
        task_queue: TemporalTaskQueue = TemporalTaskQueue.JARVIS_SYSTEM,
        idempotency_key: str | None = None,
    ) -> Workflow:
        req = WorkflowStartRequest(
            project_id=project_id,
            workflow_type=workflow_type,
            input=payload or {},
            idempotency_key=idempotency_key,
        )
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                resp = await client.post(
                    f"{self._settings.workflow_service_url}/api/v1/workflows/start",
                    json=req.model_dump(by_alias=True, mode="json"),
                )
                if resp.status_code in (200, 201):
                    wf = Workflow.model_validate(resp.json())
                    self._tracked_workflows[wf.id] = wf
                    return wf
        except Exception as exc:
            logger.debug("workflow-service HTTP bridge offline (%s); using local execution record", exc)

        now = datetime.now(timezone.utc)
        wf_id = f"wf-{workflow_type.value.lower()}-{uuid4().hex[:8]}"
        wf = Workflow(
            id=wf_id,
            project_id=project_id,
            workflow_type=workflow_type,
            namespace=namespace,
            task_queue=task_queue,
            status=WorkflowStatus.RUNNING,
            current_step="started",
            started_at=now,
            temporal_run_id=f"run-{uuid4().hex[:12]}",
            input=req.input,
            created_at=now,
            updated_at=now,
        )
        self._tracked_workflows[wf_id] = wf
        return wf

    def complete_workflow(self, workflow_id: str, result: dict[str, Any] | None = None) -> Workflow | None:
        wf = self._tracked_workflows.get(workflow_id)
        if wf is None:
            return None
        now = datetime.now(timezone.utc)
        updated = wf.model_copy(
            update={
                "status": WorkflowStatus.COMPLETED,
                "current_step": "completed",
                "completed_at": now,
                "updated_at": now,
                "result": result or {},
            }
        )
        self._tracked_workflows[workflow_id] = updated
        return updated

    def list_workflows(self, project_id: str | None = None) -> list[Workflow]:
        values = list(self._tracked_workflows.values())
        if project_id is None:
            return values
        return [w for w in values if w.project_id == project_id]
