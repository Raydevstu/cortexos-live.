from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class DesignToolAdapter:
    id: str
    name: str
    category: str
    supported_outputs: tuple[str, ...]

    def synthesize(self, *, objective: str, project_id: str) -> dict[str, Any]:
        return {
            "tool": self.id,
            "name": self.name,
            "category": self.category,
            "projectId": project_id,
            "objective": objective,
            "supportedOutputs": list(self.supported_outputs),
            "status": "ready",
        }


DESIGN_TOOL_ADAPTERS: dict[str, DesignToolAdapter] = {
    "v0": DesignToolAdapter(
        id="v0",
        name="Vercel v0 Component Synthesizer",
        category="ui_generation",
        supported_outputs=("ui_design",),
    ),
    "figma": DesignToolAdapter(
        id="figma",
        name="Figma Frame & Token Bridge",
        category="design_system",
        supported_outputs=("design_system", "wireframe"),
    ),
    "magic_patterns": DesignToolAdapter(
        id="magic_patterns",
        name="MagicPatterns Exploration Engine",
        category="layout_exploration",
        supported_outputs=("wireframe",),
    ),
    "readdy": DesignToolAdapter(
        id="readdy",
        name="Readdy Interactive Flow Builder",
        category="prototyping",
        supported_outputs=("ui_design",),
    ),
    "uizard": DesignToolAdapter(
        id="uizard",
        name="Uizard Structural Wireframer",
        category="wireframing",
        supported_outputs=("wireframe",),
    ),
}
