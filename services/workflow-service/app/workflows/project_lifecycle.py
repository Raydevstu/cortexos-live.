from __future__ import annotations

from datetime import timedelta
from typing import Any

from cortexos_types.enums import ProjectPhase, TemporalTaskQueue, WorkflowStatus, WorkflowType

from app.activities.stubs import log_decision_activity
from app.temporal_compat import workflow
from app.workflows.base_runtime import CortexTemporalWorkflowBase, DEFAULT_RETRY_POLICY
from app.workflows.phases import (
    ArchitectureWorkflow,
    DesignWorkflow,
    DevelopmentWorkflow,
    DiscoveryWorkflow,
    ProductWorkflow,
    QAWorkflow,
    ReleaseWorkflow,
)

PHASE_CHILD_MAP = {
    ProjectPhase.DISCOVERY.value: DiscoveryWorkflow,
    ProjectPhase.PRODUCT.value: ProductWorkflow,
    ProjectPhase.DESIGN.value: DesignWorkflow,
    ProjectPhase.ARCHITECTURE.value: ArchitectureWorkflow,
    ProjectPhase.DEVELOPMENT.value: DevelopmentWorkflow,
    ProjectPhase.QA.value: QAWorkflow,
    ProjectPhase.RELEASE.value: ReleaseWorkflow,
}


@workflow.defn(name="ProjectLifecycleWorkflow")
class ProjectLifecycleWorkflow(CortexTemporalWorkflowBase):
    """Master lifecycle Temporal workflow coordinating project phase sequence with pause/resume signals."""

    workflow_type = WorkflowType.PROJECT_LIFECYCLE
    name = "ProjectLifecycleWorkflow"

    def __init__(self) -> None:
        super().__init__()
        self._current_phase: str = ProjectPhase.DISCOVERY.value
        self._paused: bool = False
        self._completed_phases: list[str] = []

    @workflow.signal(name="pause_lifecycle")
    def pause_lifecycle(self) -> None:
        self._paused = True

    @workflow.signal(name="resume_lifecycle")
    def resume_lifecycle(self) -> None:
        self._paused = False

    @workflow.query(name="current_phase")
    def query_current_phase(self) -> dict[str, Any]:
        return {
            "currentPhase": self._current_phase,
            "completedPhases": list(self._completed_phases),
            "paused": self._paused,
        }

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        data = payload or {}
        await self.start(data)
        project_id = self.context.project_id if self.context else str(data.get("project_id", "proj-default"))
        phases = list(data.get("phases") or [str(data.get("toPhase") or data.get("phase") or ProjectPhase.DISCOVERY.value)])

        artifact_ids: list[str] = []
        for phase_name in phases:
            if self._paused:
                await workflow.wait_condition(lambda: not self._paused, timeout=timedelta(hours=24))

            self._current_phase = phase_name
            child_cls = PHASE_CHILD_MAP.get(phase_name, DiscoveryWorkflow)
            child_result = await workflow.execute_child_workflow(
                child_cls,
                {
                    "project_id": project_id,
                    "objective": data.get("objective") or f"Execute {phase_name} lifecycle stage",
                    "auto_approve": data.get("auto_approve", True),
                    "provider": data.get("provider", "anthropic"),
                },
                id=f"{self.workflow_id}-{phase_name}",
                task_queue=TemporalTaskQueue.JARVIS_SYSTEM.value,
            )
            self._completed_phases.append(phase_name)
            artifact_ids.extend(child_result.get("artifactIds", []))
            self.record_step(f"phase.{phase_name}.completed", child_result)

        decision = await workflow.execute_activity(
            log_decision_activity,
            {
                "project_id": project_id,
                "summary": f"Lifecycle transition completed for phases: {', '.join(self._completed_phases)}",
            },
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=DEFAULT_RETRY_POLICY,
        )

        return await self.complete(
            {
                "workflowType": self.workflow_type.value,
                "projectId": project_id,
                "status": WorkflowStatus.COMPLETED.value,
                "currentPhase": self._current_phase,
                "completedPhases": self._completed_phases,
                "artifactIds": artifact_ids,
                "decisionId": decision.get("decisionId"),
            }
        )
