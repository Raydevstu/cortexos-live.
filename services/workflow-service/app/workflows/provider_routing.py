from __future__ import annotations

from datetime import timedelta
from typing import Any

from cortexos_types.enums import WorkflowStatus, WorkflowType

from app.activities.stubs import failover_provider_activity, route_provider_activity
from app.temporal_compat import workflow
from app.workflows.base_runtime import CortexTemporalWorkflowBase, DEFAULT_RETRY_POLICY


@workflow.defn(name="ProviderRoutingWorkflow")
class ProviderRoutingWorkflow(CortexTemporalWorkflowBase):
    """Selects optimal healthy AI provider/model matching capability with automatic failover fallback."""

    workflow_type = WorkflowType.PROVIDER_ROUTING
    name = "ProviderRoutingWorkflow"

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        data = payload or {}
        await self.start(data)
        project_id = self.context.project_id if self.context else str(data.get("project_id", "proj-default"))

        routed = await workflow.execute_activity(
            route_provider_activity,
            {
                "project_id": project_id,
                "capability": data.get("capability", "reasoning"),
                "preferred_provider": data.get("preferred_provider", "anthropic"),
            },
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step("provider.routed", routed)

        if data.get("simulate_failure") or not routed.get("healthy", True):
            failover = await workflow.execute_activity(
                failover_provider_activity,
                {
                    "project_id": project_id,
                    "failed_provider": routed.get("provider", "anthropic"),
                    "reason": data.get("reason", "latency_or_rate_limit"),
                },
                start_to_close_timeout=timedelta(minutes=1),
                retry_policy=DEFAULT_RETRY_POLICY,
            )
            self.record_step("provider.failover_invoked", failover)
            return await self.complete(
                {
                    "workflowType": self.workflow_type.value,
                    "status": WorkflowStatus.COMPLETED.value,
                    "provider": failover.get("activeProvider"),
                    "failedOverFrom": routed.get("provider"),
                }
            )

        return await self.complete(
            {
                "workflowType": self.workflow_type.value,
                "status": WorkflowStatus.COMPLETED.value,
                "provider": routed.get("provider"),
                "model": routed.get("model"),
                "healthy": routed.get("healthy", True),
            }
        )


@workflow.defn(name="ProviderFailoverWorkflow")
class ProviderFailoverWorkflow(CortexTemporalWorkflowBase):
    """Recovers active studio executions when an LLM provider trips circuit breakers or rate limits."""

    workflow_type = WorkflowType.PROVIDER_FAILOVER
    name = "ProviderFailoverWorkflow"

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        data = payload or {}
        await self.start(data)
        project_id = self.context.project_id if self.context else str(data.get("project_id", "proj-default"))

        failover = await workflow.execute_activity(
            failover_provider_activity,
            {
                "project_id": project_id,
                "failed_provider": data.get("failed_provider", "anthropic"),
                "reason": data.get("reason", "circuit_breaker_open"),
            },
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step("provider.failed_over", failover)

        verified = await workflow.execute_activity(
            route_provider_activity,
            {
                "project_id": project_id,
                "capability": data.get("capability", "reasoning"),
                "preferred_provider": failover.get("activeProvider", "gemini"),
            },
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step("provider.fallback_verified", verified)

        return await self.complete(
            {
                "workflowType": self.workflow_type.value,
                "status": WorkflowStatus.COMPLETED.value,
                "failedProvider": failover.get("failedProvider"),
                "activeProvider": verified.get("provider", failover.get("activeProvider")),
                "model": verified.get("model"),
            }
        )
