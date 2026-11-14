from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from cortexos_types import ApprovalDecisionRequest
from cortexos_types.enums import ProjectPhase

from app.schemas import PendingApprovalRecord


class ApprovalEngine:
    """Manages review & human-in-the-loop approval gates across phases and artifacts."""

    def __init__(self) -> None:
        self._records: dict[str, PendingApprovalRecord] = {}

    def request_approval(
        self,
        *,
        project_id: str,
        workflow_id: str,
        phase: ProjectPhase | str,
        requested_by: str,
        reason: str,
        artifact_id: str | None = None,
    ) -> PendingApprovalRecord:
        record_id = f"apr-{uuid4().hex[:10]}"
        record = PendingApprovalRecord(
            id=record_id,
            project_id=project_id,
            workflow_id=workflow_id,
            artifact_id=artifact_id,
            phase=phase,
            requested_by=requested_by,
            reason=reason,
            status="pending",
        )
        self._records[record_id] = record
        return record

    def decide(self, decision: ApprovalDecisionRequest) -> PendingApprovalRecord:
        target: PendingApprovalRecord | None = None
        for rec in self._records.values():
            if rec.workflow_id == decision.workflow_id and (
                decision.artifact_id is None or rec.artifact_id == decision.artifact_id
            ):
                target = rec
                break

        now = datetime.now(timezone.utc)
        if target is None:
            record_id = f"apr-{uuid4().hex[:10]}"
            target = PendingApprovalRecord(
                id=record_id,
                project_id="proj-cortex-os",
                workflow_id=decision.workflow_id,
                artifact_id=decision.artifact_id,
                phase=ProjectPhase.DESIGN,
                requested_by="jarvis",
                reason="Direct approval decision",
                status="approved" if decision.approved else "rejected",
                decided_by=decision.decided_by,
                feedback=decision.feedback,
                created_at=now,
                decided_at=now,
            )
            self._records[record_id] = target
            return target

        updated = target.model_copy(
            update={
                "status": "approved" if decision.approved else "rejected",
                "decided_by": decision.decided_by,
                "feedback": decision.feedback,
                "decided_at": now,
            }
        )
        self._records[target.id] = updated
        return updated

    def list_pending(self, project_id: str | None = None) -> list[PendingApprovalRecord]:
        return [
            r
            for r in self._records.values()
            if r.status == "pending" and (project_id is None or r.project_id == project_id)
        ]

    def to_decision_requests(self, project_id: str | None = None) -> list[ApprovalDecisionRequest]:
        return [
            ApprovalDecisionRequest(
                workflow_id=r.workflow_id,
                artifact_id=r.artifact_id,
                approved=False,
                decided_by=r.requested_by,
                feedback=r.reason,
            )
            for r in self.list_pending(project_id)
        ]
