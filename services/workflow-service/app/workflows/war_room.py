from __future__ import annotations

from datetime import timedelta
from typing import Any

from cortexos_types.enums import TemporalTaskQueue, WorkflowStatus, WorkflowType

from app.activities.stubs import request_approval_activity, validate_artifact_activity
from app.temporal_compat import workflow
from app.workflows.base_runtime import CortexTemporalWorkflowBase, DEFAULT_RETRY_POLICY
from app.workflows.council import AgentCouncilWorkflow


@workflow.defn(name="WarRoomWorkflow")
class WarRoomWorkflow(CortexTemporalWorkflowBase):
    """Coordinates live War Room sessions: Agent Council deliberation, artifact inspection, and gate resolution."""

    workflow_type = WorkflowType.WAR_ROOM
    name = "WarRoomWorkflow"

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        data = payload or {}
        await self.start(data)
        project_id = self.context.project_id if self.context else str(data.get("project_id", "proj-default"))

        council_result = await workflow.execute_child_workflow(
            AgentCouncilWorkflow,
            {
                "project_id": project_id,
                "objective": data.get("objective") or "War Room operational alignment",
                "studios": data.get("studios"),
            },
            id=f"{self.workflow_id}-council",
            task_queue=TemporalTaskQueue.JARVIS_SYSTEM.value,
        )
        self.record_step("war_room.council_complete", council_result)

        artifact_id = str(data.get("artifact_id") or "")
        if artifact_id:
            validation = await workflow.execute_activity(
                validate_artifact_activity,
                {"artifact_id": artifact_id, "project_id": project_id},
                start_to_close_timeout=timedelta(minutes=2),
                retry_policy=DEFAULT_RETRY_POLICY,
            )
            self.record_step("war_room.artifact_reviewed", validation)

        approval = await workflow.execute_activity(
            request_approval_activity,
            {
                "project_id": project_id,
                "workflow_id": self.workflow_id,
                "artifact_id": artifact_id,
                "auto_approve": data.get("auto_approve", True),
                "decided_by": data.get("decided_by", "jarvis"),
            },
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step("war_room.gate_resolved", approval)

        return await self.complete(
            {
                "workflowType": self.workflow_type.value,
                "status": WorkflowStatus.COMPLETED.value,
                "consensusSummary": council_result.get("consensusSummary"),
                "opinions": council_result.get("opinions", []),
                "approved": approval.get("approved", True),
            }
        )
