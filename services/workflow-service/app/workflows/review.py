from __future__ import annotations

from datetime import timedelta
from typing import Any

from cortexos_types.enums import WorkflowStatus, WorkflowType

from app.activities.stubs import log_decision_activity, sync_librarian_activity, validate_artifact_activity
from app.temporal_compat import workflow
from app.workflows.base_runtime import CortexTemporalWorkflowBase, DEFAULT_RETRY_POLICY


@workflow.defn(name="ArtifactReviewWorkflow")
class ArtifactReviewWorkflow(CortexTemporalWorkflowBase):
    """Validates an artifact across QA criteria, indexes it in Librarian, and logs a governance decision."""

    workflow_type = WorkflowType.ARTIFACT_REVIEW
    name = "ArtifactReviewWorkflow"

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        data = payload or {}
        await self.start(data)
        project_id = self.context.project_id if self.context else str(data.get("project_id", "proj-default"))
        artifact_id = str(data.get("artifact_id") or data.get("artifactId") or "art-review-1")

        validation = await workflow.execute_activity(
            validate_artifact_activity,
            {
                "artifact_id": artifact_id,
                "project_id": project_id,
                "criteria": data.get("criteria"),
                "reviewer": data.get("reviewer", "qa-studio"),
            },
            start_to_close_timeout=timedelta(minutes=2),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step("artifact.reviewed", validation)

        sync = await workflow.execute_activity(
            sync_librarian_activity,
            {"project_id": project_id, "artifact_ids": [artifact_id]},
            start_to_close_timeout=timedelta(minutes=2),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step("artifact.indexed", sync)

        decision = await workflow.execute_activity(
            log_decision_activity,
            {"project_id": project_id, "summary": f"Reviewed and approved artifact {artifact_id}"},
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        return await self.complete(
            {
                "workflowType": self.workflow_type.value,
                "status": WorkflowStatus.COMPLETED.value,
                "artifactId": artifact_id,
                "approved": validation.get("approved", True),
                "score": validation.get("score", 0.94),
                "decisionId": decision.get("decisionId"),
            }
        )
