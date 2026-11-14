from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from cortexos_agents import AgentMemoryScope
from cortexos_studios import DesignStudio, StudioArtifactDraft, StudioContextStack
from cortexos_types import (
    AgentMemory,
    Artifact,
    StudioHandoffRequest,
    StudioManifest,
    WorkRequest,
    WorkResponse,
)
from cortexos_types.enums import (
    ProjectPhase,
    WorkResponseStatus,
)

from accessibility_validator import compute_contrast_ratio
from design_agent import DesignAgent
from design_system_generator import DEFAULT_DESIGN_PALETTE

FORBIDDEN_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bdrop\s+table\b", re.IGNORECASE),
    re.compile(r"\bsql\s+migration\b", re.IGNORECASE),
    re.compile(r"\bterraform\s+apply\b", re.IGNORECASE),
    re.compile(r"\bmodif(?:y|ies)\s+mainbrain\s+directly\b", re.IGNORECASE),
    re.compile(r"\bbypass\s+jarvis\b", re.IGNORECASE),
)


DESIGN_MANIFEST = StudioManifest(
    id="design",
    name="Design Studio",
    version="1.0.0",
    mission=(
        "Translate validated product requirements into accessible user flows, "
        "spatial wireframes, coherent design systems, and reusable UI component specifications."
    ),
    capabilities=[
        "user_flow_architecture",
        "wireframe_generation",
        "design_system_tokens",
        "component_specification",
        "wcag_aa_accessibility_review",
    ],
    supported_artifacts=[
        "wireframe",
        "ui_design",
        "design_system",
    ],
    tools=["v0", "figma", "magic_patterns", "readdy", "uizard"],
    constraints=[
        "Never modify MainBrain directly; submit all outputs as tracked Artifacts via Librarian.",
        "Never communicate directly with Development or Architecture; route through Jarvis & Agent Mesh.",
        "Never approve own artifacts past DesignReview gate.",
        "Enforce WCAG 2.1 AA contrast ratios (>= 4.5:1 body, >= 3.0:1 UI/large text).",
        "Never emit production backend code, SQL migrations, or infrastructure configs.",
    ],
)


class CortexDesignStudio(DesignStudio):
    """Reference Design Studio implementation integrating DesignAgent(CortexAgent) and Studio SDK."""

    def __init__(
        self,
        *,
        studio_dir: Path | None = None,
        palette: dict[str, str] | None = None,
    ) -> None:
        self.manifest: StudioManifest = DESIGN_MANIFEST
        self.studio_dir = studio_dir or Path(__file__).resolve().parent
        self.palette: dict[str, str] = {**DEFAULT_DESIGN_PALETTE, **(palette or {})}
        self.initialized = False
        self.local_memory: list[AgentMemory] = []
        self._context_stack: StudioContextStack | None = None
        self.agent = DesignAgent(
            palette=self.palette,
            memory_scope=AgentMemoryScope(agent_id="design-agent", global_memory_read_only=True),
        )

    def bind_context_stack(self, context_stack: StudioContextStack) -> None:
        self._context_stack = context_stack

    def get_artifacts_with_content(self) -> list[tuple[Artifact, str]]:
        return list(self.agent._artifacts.values())

    def get_accessibility_report(self) -> dict[str, Any] | None:
        return self.agent._accessibility_report

    async def initialize(self) -> None:
        mem_path = self.studio_dir / "memory" / "local-memory.json"
        if mem_path.exists():
            raw = json.loads(mem_path.read_text(encoding="utf-8"))
            self.local_memory = [AgentMemory.model_validate(item) for item in raw]
            self.agent.memory_scope.local_memories = list(self.local_memory)
        self.initialized = True

    async def create_flows(self) -> list[StudioArtifactDraft]:
        req = self.agent._active_request
        if req is None:
            raise RuntimeError("No active WorkRequest bound to DesignStudio.")
        draft = self.agent.artifact_generator.build_user_flow_draft(
            objective=req.objective,
            project_id=req.project_id,
            request_id=req.id,
            constraints=req.constraints,
            success_criteria=req.success_criteria,
        )
        self.agent._drafts["flow"] = draft
        art, content = self.agent.artifact_generator.materialize(
            prefix="art-flow", draft=draft, request=req
        )
        self.agent._artifacts[art.id] = (art, content)
        return [draft]

    async def create_wireframes(self) -> list[StudioArtifactDraft]:
        req = self.agent._active_request
        if req is None:
            raise RuntimeError("No active WorkRequest bound to DesignStudio.")
        draft = self.agent.wireframe_generator.generate(
            objective=req.objective,
            project_id=req.project_id,
            request_id=req.id,
            constraints=req.constraints,
        )
        self.agent._drafts["wireframe"] = draft
        art, content = self.agent.artifact_generator.materialize(
            prefix="art-wireframe", draft=draft, request=req
        )
        self.agent._artifacts[art.id] = (art, content)
        return [draft]

    async def create_design_system(self) -> list[StudioArtifactDraft]:
        req = self.agent._active_request
        if req is None:
            raise RuntimeError("No active WorkRequest bound to DesignStudio.")
        draft = self.agent.design_system_generator.generate(
            objective=req.objective,
            project_id=req.project_id,
            request_id=req.id,
            palette=self.palette,
        )
        self.agent._drafts["design_system"] = draft
        art, content = self.agent.artifact_generator.materialize(
            prefix="art-ds", draft=draft, request=req
        )
        self.agent._artifacts[art.id] = (art, content)
        return [draft]

    async def accessibility_review(self) -> dict[str, Any]:
        report = self.agent.accessibility_validator.validate_package(
            palette=self.palette,
            wireframe_draft=self.agent._drafts.get("wireframe"),
            design_system_draft=self.agent._drafts.get("design_system"),
        )
        self.agent._accessibility_report = report
        return report

    async def validate(self, artifact_id: str) -> bool:
        pair = self.agent._artifacts.get(artifact_id)
        if not pair:
            return False
        return await self.agent.validate()

    async def handoff(self) -> StudioHandoffRequest | None:
        return await self.agent.handoff()

    async def execute(self, request: WorkRequest) -> WorkResponse:
        if not self.initialized:
            await self.initialize()

        if request.studio_id != "design":
            return WorkResponse(
                id=f"wres-{request.id}",
                request_id=request.id,
                studio_id="design",
                status=WorkResponseStatus.FAILED,
                artifact_ids=[],
                summary=f"Incompatible studioId '{request.studio_id}' for Design Studio.",
            )

        combined = " ".join([request.objective, *request.constraints])
        for pat in FORBIDDEN_PATTERNS:
            if pat.search(combined):
                return WorkResponse(
                    id=f"wres-{request.id}",
                    request_id=request.id,
                    studio_id="design",
                    status=WorkResponseStatus.BLOCKED,
                    artifact_ids=[],
                    summary=f"Blocked by Design Studio governance constraints ({pat.pattern}).",
                )

        self.agent.bind_work(request=request, context_stack=self._context_stack)
        agent_resp = await self.agent.execute()

        if not agent_resp.success:
            return WorkResponse(
                id=f"wres-{request.id}",
                request_id=request.id,
                studio_id="design",
                status=WorkResponseStatus.BLOCKED,
                artifact_ids=agent_resp.artifact_ids,
                summary="Blocked on WCAG 2.1 AA / validation gate: " + "; ".join(agent_resp.blockers),
            )

        return WorkResponse(
            id=f"wres-{request.id}",
            request_id=request.id,
            studio_id="design",
            status=WorkResponseStatus.COMPLETED,
            artifact_ids=agent_resp.artifact_ids,
            summary=agent_resp.summary,
            next_recommended_phase=ProjectPhase.ARCHITECTURE,
        )


__all__ = [
    "CortexDesignStudio",
    "DESIGN_MANIFEST",
    "DesignAgent",
    "compute_contrast_ratio",
]
