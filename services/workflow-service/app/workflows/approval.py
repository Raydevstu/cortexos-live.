from __future__ import annotations

from datetime import timedelta
from typing import Any

from cortexos_types.enums import WorkflowStatus, WorkflowType

from app.activities.stubs import log_decision_activity, request_approval_activity
from app.temporal_compat import workflow
from app.workflows.base_runtime import CortexTemporalWorkflowBase, DEFAULT_RETRY_POLICY


@workflow.defn(name="ApprovalWorkflow")
class ApprovalWorkflow(CortexTemporalWorkflowBase):
    """Human-in-the-loop Temporal approval workflow supporting async approve/reject signals."""

    workflow_type = WorkflowType.APPROVAL
    name = "ApprovalWorkflow"

    def __init__(self) -> None:
        super().__init__()
        self._decision_received: bool = False
        self._approved: bool = False
        self._decided_by: str = "jarvis"
        self._feedback: str = ""

    @workflow.signal(name="submit_approval")
    def submit_approval(self, decision: dict[str, Any]) -> None:
        self._approved = bool(decision.get("approved", True))
        self._decided_by = str(decision.get("decidedBy") or decision.get("decided_by") or "owner")
        self._feedback = str(decision.get("feedback") or "")
        self._decision_received = True

    @workflow.query(name="approval_status")
    def query_approval_status(self) -> dict[str, Any]:
        return {
            "received": self._decision_received,
            "approved": self._approved,
            "decidedBy": self._decided_by,
            "feedback": self._feedback,
        }

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        data = payload or {}
        await self.start(data)
        project_id = self.context.project_id if self.context else str(data.get("project_id", "proj-default"))

        if "approved" in data or data.get("auto_approve", False):
            self._approved = bool(data.get("approved", True))
            self._decided_by = str(data.get("decided_by") or "jarvis")
            self._feedback = str(data.get("feedback") or "")
            self._decision_received = True

        gate_state = await workflow.execute_activity(
            request_approval_activity,
            {
                "project_id": project_id,
                "workflow_id": self.workflow_id,
                "artifact_id": data.get("artifact_id", ""),
                "auto_approve": self._decision_received and self._approved,
                "decided_by": self._decided_by,
            },
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step("approval.gate_opened", gate_state)

        if not self._decision_received:
            if self.context:
                self.context.status = WorkflowStatus.WAITING_APPROVAL
            await workflow.wait_condition(lambda: self._decision_received, timeout=timedelta(days=7))

        decision_log = await workflow.execute_activity(
            log_decision_activity,
            {
                "project_id": project_id,
                "summary": f"Approval gate {'approved' if self._approved else 'rejected'} by {self._decided_by}",
            },
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step("approval.decided", decision_log)

        return await self.complete(
            {
                "workflowType": self.workflow_type.value,
                "status": WorkflowStatus.COMPLETED.value,
                "approved": self._approved,
                "decidedBy": self._decided_by,
                "feedback": self._feedback,
                "decisionId": decision_log.get("decisionId"),
            }
        )
