from __future__ import annotations

from datetime import timedelta
from typing import Any

from cortexos_types.enums import StudioId, WorkflowStatus, WorkflowType

from app.activities.stubs import convene_council_member_activity, log_decision_activity
from app.temporal_compat import workflow
from app.workflows.base_runtime import CortexTemporalWorkflowBase, DEFAULT_RETRY_POLICY


@workflow.defn(name="AgentCouncilWorkflow")
class AgentCouncilWorkflow(CortexTemporalWorkflowBase):
    """Multi-studio deliberation workflow collecting structured opinions, risks, and consensus decisions."""

    workflow_type = WorkflowType.AGENT_COUNCIL
    name = "AgentCouncilWorkflow"

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        data = payload or {}
        await self.start(data)
        project_id = self.context.project_id if self.context else str(data.get("project_id", "proj-default"))
        objective = str(data.get("objective") or "Evaluate architecture and rollout plan")
        studios = list(data.get("studios") or [s.value for s in StudioId])

        opinions: list[dict[str, Any]] = []
        for studio_id in studios:
            opinion = await workflow.execute_activity(
                convene_council_member_activity,
                {"project_id": project_id, "studio_id": studio_id, "objective": objective},
                start_to_close_timeout=timedelta(minutes=2),
                retry_policy=DEFAULT_RETRY_POLICY,
            )
            opinions.append(opinion)
        self.record_step("council.opinions_collected", {"count": len(opinions)})

        decisions = [op["recommendation"] for op in opinions[:3]]
        risks = [op["risk"] for op in opinions[:3]]
        consensus_summary = f"Council consensus across {len(opinions)} studios for '{objective}': proceed with Jarvis-governed gated rollout."

        decision_log = await workflow.execute_activity(
            log_decision_activity,
            {"project_id": project_id, "summary": consensus_summary},
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step("council.consensus_recorded", decision_log)

        return await self.complete(
            {
                "workflowType": self.workflow_type.value,
                "status": WorkflowStatus.COMPLETED.value,
                "objective": objective,
                "opinions": opinions,
                "consensusSummary": consensus_summary,
                "decisions": decisions,
                "risks": risks,
                "decisionId": decision_log.get("decisionId"),
            }
        )
