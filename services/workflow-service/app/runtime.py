from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from cortexos_events import InMemoryEventBus, build_event
from cortexos_types import ApprovalDecisionRequest, Workflow, WorkflowExecution, WorkflowStartRequest
from cortexos_types.enums import CortexEventType, WorkflowStatus, WorkflowType

from app.clusters import TEMPORAL_CLUSTER_TOPOLOGY, resolve_route
from app.core.config import Settings, get_settings
from app.temporal_compat import TEMPORAL_SDK_AVAILABLE, TemporalClient
from app.workers import knowledge_worker, provider_worker, studio_worker, system_worker
from app.workflows import WORKFLOW_REGISTRY

logger = logging.getLogger(__name__)


class TemporalRuntimeManager:
    """Hosts Temporal worker topologies, runs all 16 workflows, tracks executions, and emits workflow domain events."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.event_bus = InMemoryEventBus()
        self._workflows: dict[str, Workflow] = {}
        self._executions: dict[str, list[WorkflowExecution]] = {}
        self._instances: dict[str, Any] = {}
        self._idempotency_index: dict[str, str] = {}
        self._temporal_client: Any = None
        self._temporal_connected: bool = False

    async def connect_temporal(self) -> bool:
        if not TEMPORAL_SDK_AVAILABLE or TemporalClient is None:
            return False
        try:
            self._temporal_client = await TemporalClient.connect(self.settings.temporal_address)
            self._temporal_connected = True
            return True
        except Exception as exc:
            logger.debug("Temporal server unreachable at %s (%s); using in-process Temporal runner", self.settings.temporal_address, exc)
            self._temporal_connected = False
            return False

    def topology_summary(self) -> dict[str, Any]:
        return {
            "temporalSdkAvailable": TEMPORAL_SDK_AVAILABLE,
            "temporalConnected": self._temporal_connected,
            "temporalAddress": self.settings.temporal_address,
            "registeredWorkflows": [wf.value for wf in WORKFLOW_REGISTRY.keys()],
            "namespaces": {
                spec.namespace.value: {
                    "taskQueue": spec.task_queue.value,
                    "retentionDays": spec.retention_days,
                    "workflows": [w.value for w in spec.workflows],
                }
                for spec in TEMPORAL_CLUSTER_TOPOLOGY.values()
            },
            "workers": [
                system_worker.build_worker_spec(),
                studio_worker.build_worker_spec(),
                knowledge_worker.build_worker_spec(),
                provider_worker.build_worker_spec(),
            ],
        }

    async def start_workflow(self, request: WorkflowStartRequest) -> Workflow:
        if request.idempotency_key and request.idempotency_key in self._idempotency_index:
            existing_id = self._idempotency_index[request.idempotency_key]
            if existing_id in self._workflows:
                return self._workflows[existing_id]

        workflow_cls = WORKFLOW_REGISTRY.get(request.workflow_type)
        if workflow_cls is None:
            raise KeyError(f"WorkflowType '{request.workflow_type.value}' is not registered in WORKFLOW_REGISTRY.")

        namespace, task_queue = resolve_route(request.workflow_type)
        now = datetime.now(timezone.utc)
        wf_id = f"wf-{request.workflow_type.value.lower()}-{uuid4().hex[:8]}"
        run_id = f"run-{uuid4().hex[:12]}"

        wf_record = Workflow(
            id=wf_id,
            organization_id=self.settings.default_organization_id,
            project_id=request.project_id,
            workflow_type=request.workflow_type,
            namespace=namespace,
            task_queue=task_queue,
            status=WorkflowStatus.RUNNING,
            current_step="started",
            started_at=now,
            temporal_run_id=run_id,
            input=request.input,
            created_at=now,
            updated_at=now,
        )
        self._workflows[wf_id] = wf_record
        if request.idempotency_key:
            self._idempotency_index[request.idempotency_key] = wf_id

        await self.event_bus.publish(
            build_event(
                event_type=CortexEventType.WORKFLOW_STARTED,
                source="workflow-service",
                project_id=request.project_id,
                payload={"workflowId": wf_id, "workflowType": request.workflow_type.value, "taskQueue": task_queue.value},
            )
        )

        exec_id = f"exec-{uuid4().hex[:8]}"
        instance = workflow_cls()
        self._instances[wf_id] = instance
        exec_payload = {
            **request.input,
            "project_id": request.project_id,
            "workflow_id": wf_id,
        }

        try:
            # If Temporal server is live, invoke via TemporalClient, otherwise run the decorated Temporal workflow class directly
            if self._temporal_connected and self._temporal_client is not None:
                handle = await self._temporal_client.start_workflow(
                    workflow_cls.run,
                    exec_payload,
                    id=wf_id,
                    task_queue=task_queue.value,
                )
                result = await handle.result()
            else:
                result = await instance.run(exec_payload)

            completed_at = datetime.now(timezone.utc)
            final_status = WorkflowStatus(result.get("status", WorkflowStatus.COMPLETED.value))
            wf_record = wf_record.model_copy(
                update={
                    "status": final_status,
                    "current_step": instance.context.current_step if instance.context else "completed",
                    "completed_at": completed_at if final_status == WorkflowStatus.COMPLETED else None,
                    "updated_at": completed_at,
                    "result": result,
                }
            )
            self._workflows[wf_id] = wf_record
            self._executions.setdefault(wf_id, []).append(
                WorkflowExecution(
                    id=f"wfe-{uuid4().hex[:8]}",
                    workflow_id=wf_id,
                    execution_id=exec_id,
                    status=final_status,
                    started_at=now,
                    completed_at=completed_at,
                    retry_count=0,
                    created_at=now,
                    updated_at=completed_at,
                )
            )
            await self.event_bus.publish(
                build_event(
                    event_type=CortexEventType.WORKFLOW_COMPLETED,
                    source="workflow-service",
                    project_id=request.project_id,
                    payload={"workflowId": wf_id, "workflowType": request.workflow_type.value, "status": final_status.value},
                )
            )
        except Exception as exc:
            failed_at = datetime.now(timezone.utc)
            wf_record = wf_record.model_copy(
                update={
                    "status": WorkflowStatus.FAILED,
                    "current_step": "failed",
                    "updated_at": failed_at,
                    "result": {"error": str(exc)},
                }
            )
            self._workflows[wf_id] = wf_record
            self._executions.setdefault(wf_id, []).append(
                WorkflowExecution(
                    id=f"wfe-{uuid4().hex[:8]}",
                    workflow_id=wf_id,
                    execution_id=exec_id,
                    status=WorkflowStatus.FAILED,
                    started_at=now,
                    completed_at=failed_at,
                    retry_count=0,
                    error=str(exc),
                    created_at=now,
                    updated_at=failed_at,
                )
            )
            await self.event_bus.publish(
                build_event(
                    event_type=CortexEventType.WORKFLOW_FAILED,
                    source="workflow-service",
                    project_id=request.project_id,
                    payload={"workflowId": wf_id, "workflowType": request.workflow_type.value, "error": str(exc)},
                )
            )

        return self._workflows[wf_id]

    async def signal_approval(self, decision: ApprovalDecisionRequest) -> Workflow | None:
        wf = self._workflows.get(decision.workflow_id)
        instance = self._instances.get(decision.workflow_id)
        if wf is None or instance is None:
            return None
        if hasattr(instance, "submit_approval"):
            instance.submit_approval(decision.model_dump(by_alias=True, mode="json"))
        now = datetime.now(timezone.utc)
        updated = wf.model_copy(
            update={
                "status": WorkflowStatus.COMPLETED,
                "current_step": "approval.decided",
                "completed_at": now,
                "updated_at": now,
                "result": {**wf.result, "approved": decision.approved, "decidedBy": decision.decided_by},
            }
        )
        self._workflows[decision.workflow_id] = updated
        return updated

    def get_workflow(self, workflow_id: str) -> Workflow | None:
        return self._workflows.get(workflow_id)

    def list_workflows(self, project_id: str | None = None) -> list[Workflow]:
        all_wf = list(self._workflows.values())
        if project_id:
            return [w for w in all_wf if w.project_id == project_id]
        return all_wf

    def list_executions(self, workflow_id: str) -> list[WorkflowExecution]:
        return list(self._executions.get(workflow_id, []))
