from __future__ import annotations

from datetime import timedelta
from typing import Any

from cortexos_types.enums import ProjectPhase, StudioId, WorkflowStatus, WorkflowType

from app.activities.stubs import (
    dispatch_work_request_activity,
    log_decision_activity,
    request_approval_activity,
    sync_librarian_activity,
    validate_artifact_activity,
)
from app.temporal_compat import workflow
from app.workflows.base_runtime import CortexTemporalWorkflowBase, DEFAULT_RETRY_POLICY


class _StudioPhaseWorkflowBase(CortexTemporalWorkflowBase):
    phase: ProjectPhase = ProjectPhase.DISCOVERY
    studio_id: StudioId = StudioId.DISCOVERY

    async def _run_phase(self, payload: dict[str, Any]) -> dict[str, Any]:
        await self.start(payload)
        project_id = self.context.project_id if self.context else str(payload.get("project_id", "proj-default"))
        studio_payload = {
            "project_id": project_id,
            "studio_id": self.studio_id.value,
            "phase": self.phase.value,
            "objective": payload.get("objective") or f"Execute {self.phase.value} phase deliverables",
            "constraints": payload.get("constraints", []),
            "context_artifacts": payload.get("context_artifacts", []),
            "provider": payload.get("provider", "anthropic"),
            "model": payload.get("model", "claude-sonnet-4"),
        }

        execution = await workflow.execute_activity(
            dispatch_work_request_activity,
            studio_payload,
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step(f"{self.phase.value}.studio_executed", execution)

        artifact_ids = list(execution.get("artifactIds") or [])
        validations: list[dict[str, Any]] = []
        for art_id in artifact_ids:
            validation = await workflow.execute_activity(
                validate_artifact_activity,
                {"artifact_id": art_id, "project_id": project_id},
                start_to_close_timeout=timedelta(minutes=2),
                retry_policy=DEFAULT_RETRY_POLICY,
            )
            validations.append(validation)
        self.record_step(f"{self.phase.value}.validated", {"validations": validations})

        approval = await workflow.execute_activity(
            request_approval_activity,
            {
                "project_id": project_id,
                "workflow_id": self.workflow_id,
                "artifact_id": artifact_ids[0] if artifact_ids else "",
                "auto_approve": payload.get("auto_approve", True),
                "decided_by": payload.get("approved_by", "jarvis"),
            },
            start_to_close_timeout=timedelta(minutes=2),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step(f"{self.phase.value}.approval", approval)

        if not approval.get("approved", True):
            if self.context:
                self.context.status = WorkflowStatus.WAITING_APPROVAL
            return {
                "workflowType": self.workflow_type.value,
                "phase": self.phase.value,
                "studioId": self.studio_id.value,
                "status": WorkflowStatus.WAITING_APPROVAL.value,
                "artifactIds": artifact_ids,
            }

        librarian_sync = await workflow.execute_activity(
            sync_librarian_activity,
            {"project_id": project_id, "artifact_ids": artifact_ids},
            start_to_close_timeout=timedelta(minutes=2),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step(f"{self.phase.value}.librarian_synced", librarian_sync)

        decision = await workflow.execute_activity(
            log_decision_activity,
            {"project_id": project_id, "summary": f"Completed {self.phase.value} phase via {self.studio_id.value} studio"},
            start_to_close_timeout=timedelta(minutes=1),
            retry_policy=DEFAULT_RETRY_POLICY,
        )
        self.record_step(f"{self.phase.value}.decision_logged", decision)

        return await self.complete(
            {
                "workflowType": self.workflow_type.value,
                "phase": self.phase.value,
                "studioId": self.studio_id.value,
                "status": WorkflowStatus.COMPLETED.value,
                "artifactIds": artifact_ids,
                "summary": execution.get("summary", ""),
                "decisionId": decision.get("decisionId"),
            }
        )


@workflow.defn(name="DiscoveryWorkflow")
class DiscoveryWorkflow(_StudioPhaseWorkflowBase):
    workflow_type = WorkflowType.DISCOVERY
    name = "DiscoveryWorkflow"
    phase = ProjectPhase.DISCOVERY
    studio_id = StudioId.DISCOVERY

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        return await self._run_phase(payload or {})


@workflow.defn(name="ProductWorkflow")
class ProductWorkflow(_StudioPhaseWorkflowBase):
    workflow_type = WorkflowType.PRODUCT
    name = "ProductWorkflow"
    phase = ProjectPhase.PRODUCT
    studio_id = StudioId.PRODUCT

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        return await self._run_phase(payload or {})


@workflow.defn(name="DesignWorkflow")
class DesignWorkflow(_StudioPhaseWorkflowBase):
    workflow_type = WorkflowType.DESIGN
    name = "DesignWorkflow"
    phase = ProjectPhase.DESIGN
    studio_id = StudioId.DESIGN

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        return await self._run_phase(payload or {})


@workflow.defn(name="ArchitectureWorkflow")
class ArchitectureWorkflow(_StudioPhaseWorkflowBase):
    workflow_type = WorkflowType.ARCHITECTURE
    name = "ArchitectureWorkflow"
    phase = ProjectPhase.ARCHITECTURE
    studio_id = StudioId.ARCHITECTURE

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        return await self._run_phase(payload or {})


@workflow.defn(name="DevelopmentWorkflow")
class DevelopmentWorkflow(_StudioPhaseWorkflowBase):
    workflow_type = WorkflowType.DEVELOPMENT
    name = "DevelopmentWorkflow"
    phase = ProjectPhase.DEVELOPMENT
    studio_id = StudioId.DEVELOPMENT

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        return await self._run_phase(payload or {})


@workflow.defn(name="QAWorkflow")
class QAWorkflow(_StudioPhaseWorkflowBase):
    workflow_type = WorkflowType.QA
    name = "QAWorkflow"
    phase = ProjectPhase.QA
    studio_id = StudioId.QA

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        return await self._run_phase(payload or {})


@workflow.defn(name="ReleaseWorkflow")
class ReleaseWorkflow(_StudioPhaseWorkflowBase):
    workflow_type = WorkflowType.RELEASE
    name = "ReleaseWorkflow"
    phase = ProjectPhase.RELEASE
    studio_id = StudioId.RELEASE

    @workflow.run
    async def run(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        return await self._run_phase(payload or {})
