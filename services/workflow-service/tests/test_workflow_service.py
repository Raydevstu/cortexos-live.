from __future__ import annotations

import asyncio

from cortexos_types import WorkflowStartRequest
from cortexos_types.enums import WorkflowStatus, WorkflowType

from app.runtime import TemporalRuntimeManager
from app.workflows import WORKFLOW_REGISTRY


def test_all_16_workflows_registered() -> None:
    expected = {
        WorkflowType.PROJECT_LIFECYCLE,
        WorkflowType.DISCOVERY,
        WorkflowType.PRODUCT,
        WorkflowType.DESIGN,
        WorkflowType.ARCHITECTURE,
        WorkflowType.DEVELOPMENT,
        WorkflowType.QA,
        WorkflowType.RELEASE,
        WorkflowType.WORK_REQUEST,
        WorkflowType.AGENT_EXECUTION,
        WorkflowType.APPROVAL,
        WorkflowType.ARTIFACT_REVIEW,
        WorkflowType.WAR_ROOM,
        WorkflowType.AGENT_COUNCIL,
        WorkflowType.PROVIDER_ROUTING,
        WorkflowType.PROVIDER_FAILOVER,
    }
    assert expected.issubset(set(WORKFLOW_REGISTRY.keys()))


def test_all_workflows_execute_cleanly() -> None:
    async def _run() -> None:
        manager = TemporalRuntimeManager()
        for wf_type in [
            WorkflowType.PROJECT_LIFECYCLE,
            WorkflowType.DISCOVERY,
            WorkflowType.PRODUCT,
            WorkflowType.DESIGN,
            WorkflowType.ARCHITECTURE,
            WorkflowType.DEVELOPMENT,
            WorkflowType.QA,
            WorkflowType.RELEASE,
            WorkflowType.WORK_REQUEST,
            WorkflowType.AGENT_EXECUTION,
            WorkflowType.APPROVAL,
            WorkflowType.ARTIFACT_REVIEW,
            WorkflowType.WAR_ROOM,
            WorkflowType.AGENT_COUNCIL,
            WorkflowType.PROVIDER_ROUTING,
            WorkflowType.PROVIDER_FAILOVER,
        ]:
            res = await manager.start_workflow(
                WorkflowStartRequest(
                    project_id="proj-cortex-test",
                    workflow_type=wf_type,
                    input={"objective": f"Verify {wf_type.value}", "auto_approve": True},
                )
            )
            assert res.status == WorkflowStatus.COMPLETED
            assert res.result.get("workflowType") == wf_type.value

    asyncio.run(_run())
