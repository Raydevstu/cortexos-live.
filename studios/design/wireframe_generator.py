from __future__ import annotations

from cortexos_studios import StudioArtifactDraft
from cortexos_types.enums import ArtifactType


class WireframeGenerator:
    """Generates spatial wireframe specifications covering desktop/tablet/mobile & ARIA states."""

    def generate(
        self,
        *,
        objective: str,
        project_id: str,
        request_id: str,
        constraints: list[str] | None = None,
        context_notes: list[str] | None = None,
    ) -> StudioArtifactDraft:
        constraints = constraints or []
        context_notes = context_notes or []

        lines = [
            f"# Spatial Wireframe Specification — {objective}",
            "",
            f"- **Project ID**: `{project_id}`",
            f"- **Work Request ID**: `{request_id}`",
            "- **Grid System**: 12-col desktop (>=1280px) / 8-col tablet (>=768px) / 4-col mobile (<768px)",
            "",
            "## 1. Semantic Landmark Topology",
            "- `<header role=\"banner\">`: Persistent Agent Dock & active phase telemetry.",
            "- `<main>`: MainBrain Canvas + Terminal Sandbox execution surface (>=72% viewport).",
            "- `<aside role=\"complementary\">`: Summonable Context & Artifact Drawer (dismisses on `Escape`).",
            "",
            "## 2. Keyboard Traversal & Focus Plan",
            "1. Skip-to-main anchor (`Tab` #1)",
            "2. Agent Dock workspace triggers (`Tab` / Left-Right Arrow keys)",
            "3. Primary workspace CTA & Terminal command bar",
            "4. Slide-over drawer close (`Escape` restores focus to invoking trigger)",
            "",
            "## 3. Component State Matrix",
            "- **Populated**: Primary content aligned to `4px` spacing baseline.",
            "- **Loading**: Layout-matched skeletons (`aria-busy=\"true\"`, zero CLS).",
            "- **Empty**: Direct guidance with primary creation CTA.",
            "- **Error**: Non-blocking recoverable alert with retry trigger.",
        ]
        if constraints:
            lines.extend(["", "## 4. Constraints Honored", *(f"- {c}" for c in constraints)])
        if context_notes:
            lines.extend(["", "## 5. Injected Context References", *(f"- {n}" for n in context_notes)])

        return StudioArtifactDraft(
            artifact_type=ArtifactType.WIREFRAME,
            title=f"Wireframe Spec: {objective[:64]}",
            summary=f"Responsive spatial wireframes, ARIA landmarks, and focus plan for '{objective}'.",
            content="\n".join(lines),
            tags=["design", "wireframe", "responsive-layout"],
            metadata={
                "workRequestId": request_id,
                "activity": "WireframeGeneration",
                "hasPrimaryMainLandmark": True,
                "hasKeyboardTraversalPlan": True,
                "hasLoadingEmptyErrorStates": True,
                "toolsReferenced": ["uizard", "figma", "magic_patterns"],
            },
        )
