from __future__ import annotations

from datetime import timedelta
from typing import Any

from cortexos_types.enums import WorkflowStatus, WorkflowType

from app.activities.stubs import execute_studio_activity, route_provider_activity, validate_artifact_activity
from app.temporal_compat import workflow
from app.workflows.base_runtime import CortexTemporalWorkflowBase, DEFAULT_RETRY_POLICY


@workflow.defn(name="AgentExecutionWorkflow")
class AgentExecutionWorkflow(CortexTemporalWorkflowBase):
    """Durable workflow executing a single Studio/Agent task with retries and artifact QA verification."""

    workflow_type = WorkflowType.AGENT_EXECUTION
    name = "AgentExecutionWorkflow"

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        data = payload or {}
        await self.start(data)
        project_id = self.context.project_id if self.context else str(data.get("project_id", "proj-default"))

        route = await workflow.execute_activity(
            route_provider_activity,
            {
                "capability": data.get("capability", "coding"),
                "preferred_provider": data.get("provider", "anthropic"),
            },
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step("agent.provider_selected", route)

        execution = await workflow.execute_activity(
            execute_studio_activity,
            {
                **data,
                "project_id": project_id,
                "provider": route.get("provider"),
                "model": route.get("model"),
            },
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step("agent.executed", execution)

        artifact_ids = list(execution.get("artifactIds") or [])
        if artifact_ids:
            validation = await workflow.execute_activity(
                validate_artifact_activity,
                {"artifact_id": artifact_ids[0], "project_id": project_id},
                start_to_close_timeout=timedelta(minutes=2),
                retry_policy=DEFAULT_RETRY_POLICY,
            )
            self.record_step("agent.artifact_verified", validation)

        return await self.complete(
            {
                "workflowType": self.workflow_type.value,
                "status": WorkflowStatus.COMPLETED.value,
                "studioId": execution.get("studioId"),
                "artifactIds": artifact_ids,
                "provider": route.get("provider"),
                "model": route.get("model"),
                "summary": execution.get("summary", ""),
            }
        )
