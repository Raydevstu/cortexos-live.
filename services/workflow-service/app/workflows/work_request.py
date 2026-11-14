from __future__ import annotations

from datetime import timedelta
from typing import Any

from cortexos_types.enums import WorkflowStatus, WorkflowType

from app.activities.stubs import (
    dispatch_work_request_activity,
    log_decision_activity,
    route_provider_activity,
    sync_librarian_activity,
    validate_artifact_activity,
)
from app.temporal_compat import workflow
from app.workflows.base_runtime import CortexTemporalWorkflowBase, DEFAULT_RETRY_POLICY


@workflow.defn(name="WorkRequestWorkflow")
class WorkRequestWorkflow(CortexTemporalWorkflowBase):
    """Durable workflow executing Jarvis -> Provider Route -> Studio Runtime -> Validation -> Librarian Sync."""

    workflow_type = WorkflowType.WORK_REQUEST
    name = "WorkRequestWorkflow"

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        data = payload or {}
        await self.start(data)
        project_id = self.context.project_id if self.context else str(data.get("project_id", "proj-default"))

        route = await workflow.execute_activity(
            route_provider_activity,
            {
                "capability": data.get("capability", "reasoning"),
                "preferred_provider": data.get("provider", "anthropic"),
            },
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step("work_request.provider_routed", route)

        dispatch = await workflow.execute_activity(
            dispatch_work_request_activity,
            {
                **data,
                "project_id": project_id,
                "provider": route.get("provider", "anthropic"),
                "model": route.get("model", "claude-sonnet-4"),
            },
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step("work_request.studio_executed", dispatch)

        artifact_ids = list(dispatch.get("artifactIds") or [])
        if artifact_ids:
            validation = await workflow.execute_activity(
                validate_artifact_activity,
                {"artifact_id": artifact_ids[0], "project_id": project_id},
                start_to_close_timeout=timedelta(minutes=2),
                retry_policy=DEFAULT_RETRY_POLICY,
            )
            self.record_step("work_request.artifact_validated", validation)

        sync = await workflow.execute_activity(
            sync_librarian_activity,
            {"project_id": project_id, "artifact_ids": artifact_ids},
            start_to_close_timeout=timedelta(minutes=2),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step("work_request.librarian_synced", sync)

        decision = await workflow.execute_activity(
            log_decision_activity,
            {
                "project_id": project_id,
                "summary": f"WorkRequest {dispatch.get('workRequestId', '')} completed by {dispatch.get('studioId', 'studio')}",
            },
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        return await self.complete(
            {
                "workflowType": self.workflow_type.value,
                "status": WorkflowStatus.COMPLETED.value,
                "workRequestId": dispatch.get("workRequestId"),
                "studioId": dispatch.get("studioId"),
                "provider": route.get("provider"),
                "model": route.get("model"),
                "artifactIds": artifact_ids,
                "summary": dispatch.get("summary", ""),
                "decisionId": decision.get("decisionId"),
            }
        )
