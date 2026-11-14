from __future__ import annotations

from typing import Any

from cortexos_agents import AgentMemoryScope, CortexAgent
from cortexos_studios import StudioArtifactDraft, StudioContextStack
from cortexos_types import (
    AgentContext,
    AgentResponse,
    Artifact,
    StudioHandoffRequest,
    WorkRequest,
)
from cortexos_types.enums import AgentStatus, ArtifactType

from accessibility_validator import AccessibilityValidator
from artifact_generator import DesignArtifactGenerator
from design_system_generator import DEFAULT_DESIGN_PALETTE, DesignSystemGenerator
from wireframe_generator import WireframeGenerator


class DesignAgent(CortexAgent):
    """Experience Architect agent implementing the CortexOS CortexAgent SDK interface."""

    def __init__(
        self,
        *,
        palette: dict[str, str] | None = None,
        memory_scope: AgentMemoryScope | None = None,
    ) -> None:
        self.id = "design-agent"
        self.name = "Design Agent"
        self.role = "Experience Architect"
        self.studio_id = "design"
        self.status = AgentStatus.IDLE

        self.palette = {**DEFAULT_DESIGN_PALETTE, **(palette or {})}
        self.memory_scope = memory_scope or AgentMemoryScope(
            agent_id=self.id,
            global_memory_read_only=True,
        )

        self.wireframe_generator = WireframeGenerator()
        self.design_system_generator = DesignSystemGenerator()
        self.accessibility_validator = AccessibilityValidator()
        self.artifact_generator = DesignArtifactGenerator()

        self._active_request: WorkRequest | None = None
        self._context_stack: StudioContextStack | None = None
        self._planned_steps: list[str] = []
        self._drafts: dict[str, StudioArtifactDraft] = {}
        self._artifacts: dict[str, tuple[Artifact, str]] = {}
        self._accessibility_report: dict[str, Any] | None = None
        self._last_handoff: StudioHandoffRequest | None = None

    def bind_work(
        self,
        *,
        request: WorkRequest,
        context_stack: StudioContextStack | None = None,
    ) -> None:
        self._active_request = request
        self._context_stack = context_stack
        self._drafts.clear()
        self._artifacts.clear()
        self._accessibility_report = None
        self._last_handoff = None
        if context_stack and context_stack.local_memory:
            self.memory_scope.local_memories = list(context_stack.local_memory)

    async def plan(self, context: AgentContext | None = None) -> list[str]:
        self.status = AgentStatus.PLANNING
        constraints_count = (
            len(context.constraints)
            if context
            else len(self._active_request.constraints if self._active_request else [])
        )
        self._planned_steps = [
            "FlowDesign: Synthesize end-to-end user journeys & interaction states",
            "WireframeGeneration: Produce responsive 12/8/4 spatial grid & ARIA landmarks",
            "DesignSystemCreation: Emit semantic CSS tokens & reduced-motion rules",
            f"AccessibilityReview: Enforce WCAG 2.1 AA against {constraints_count} constraint(s)",
            "DesignReview: Package validated artifacts for Jarvis & Agent Mesh handoff",
        ]
        return list(self._planned_steps)

    async def execute(self, context: AgentContext | None = None) -> AgentResponse:
        if self._active_request is None:
            if context is None:
                self.status = AgentStatus.FAILED
                return AgentResponse(
                    success=False,
                    summary="DesignAgent cannot execute without a bound WorkRequest or AgentContext.",
                    artifact_ids=[],
                    recommendations=["Bind WorkRequest via bind_work() or pass AgentContext."],
                    blockers=["Missing WorkRequest/AgentContext"],
                )
            from datetime import datetime, timezone

            now = datetime.now(timezone.utc)
            self._active_request = WorkRequest(
                id=context.work_request_id,
                project_id=context.project_id,
                studio_id="design",
                objective="Synthesize Design Studio experience package",
                constraints=list(context.constraints),
                context_artifacts=list(context.artifact_ids),
                created_at=now,
                updated_at=now,
            )

        await self.plan(context)
        self.status = AgentStatus.EXECUTING
        await self.create_artifact()

        self.status = AgentStatus.REVIEWING
        self._accessibility_report = self.accessibility_validator.validate_package(
            palette=self.palette,
            wireframe_draft=self._drafts.get("wireframe"),
            design_system_draft=self._drafts.get("design_system"),
        )
        for _aid, (art, _content) in self._artifacts.items():
            if art.artifact_type == ArtifactType.DESIGN_SYSTEM:
                art.metadata["accessibilityReport"] = self._accessibility_report

        valid = await self.validate()
        if not valid or not self._accessibility_report["passed"]:
            self.status = AgentStatus.BLOCKED
            blockers = list(self._accessibility_report["blockers"])
            return AgentResponse(
                success=False,
                summary="Blocked on Design Studio Accessibility/Validation gate.",
                artifact_ids=list(self._artifacts.keys()),
                recommendations=["Adjust token contrast ratios to satisfy WCAG 2.1 AA >= 4.5:1."],
                blockers=blockers,
            )

        await self.handoff()
        self.status = AgentStatus.COMPLETED
        return AgentResponse(
            success=True,
            summary=await self.summarize(),
            artifact_ids=list(self._artifacts.keys()),
            recommendations=["Proceed to Architecture Studio for OpenAPI & Schema modeling."],
            blockers=[],
        )

    async def create_artifact(self, payload: dict[str, Any] | None = None) -> list[Artifact]:
        req = self._active_request
        if req is None:
            raise RuntimeError("No active WorkRequest bound to DesignAgent.")

        notes: list[str] = []
        if self._context_stack:
            notes.extend(a.title for a in self._context_stack.context_artifacts)

        flow_draft = self.artifact_generator.build_user_flow_draft(
            objective=req.objective,
            project_id=req.project_id,
            request_id=req.id,
            constraints=req.constraints,
            success_criteria=req.success_criteria,
        )
        wireframe_draft = self.wireframe_generator.generate(
            objective=req.objective,
            project_id=req.project_id,
            request_id=req.id,
            constraints=req.constraints,
            context_notes=notes,
        )
        ds_draft = self.design_system_generator.generate(
            objective=req.objective,
            project_id=req.project_id,
            request_id=req.id,
            palette=self.palette,
        )

        self._drafts = {
            "flow": flow_draft,
            "wireframe": wireframe_draft,
            "design_system": ds_draft,
        }

        emitted: list[Artifact] = []
        for prefix, draft in (
            ("art-flow", flow_draft),
            ("art-wireframe", wireframe_draft),
            ("art-ds", ds_draft),
        ):
            artifact, content = self.artifact_generator.materialize(
                prefix=prefix,
                draft=draft,
                request=req,
            )
            self._artifacts[artifact.id] = (artifact, content)
            emitted.append(artifact)
        return emitted

    async def validate(self) -> bool:
        if not self._artifacts:
            return False
        if self._accessibility_report is None:
            self._accessibility_report = self.accessibility_validator.validate_package(
                palette=self.palette,
                wireframe_draft=self._drafts.get("wireframe"),
                design_system_draft=self._drafts.get("design_system"),
            )
        if not self._accessibility_report["passed"]:
            return False
        for artifact, content in self._artifacts.values():
            if not content.strip() or not artifact.checksum or len(artifact.checksum) != 64:
                return False
        return True

    async def summarize(self) -> str:
        req = self._active_request
        score = (self._accessibility_report or {}).get("score", 100)
        return (
            f"DesignAgent produced {len(self._artifacts)} validated experience artifacts "
            f"(ui_design, wireframe, design_system) for '{req.objective if req else 'unknown'}' "
            f"with WCAG 2.1 AA score {score}%."
        )

    async def handoff(self) -> StudioHandoffRequest | None:
        if self._active_request is None or not self._artifacts:
            return None
        req = self._active_request
        handoff_req = StudioHandoffRequest(
            project_id=req.project_id,
            from_studio_id="design",
            to_studio_id="architecture",
            artifact_ids=list(self._artifacts.keys()),
            summary=await self.summarize(),
        )
        self._last_handoff = handoff_req
        return handoff_req
