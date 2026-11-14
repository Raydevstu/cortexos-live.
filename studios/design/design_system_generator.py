from __future__ import annotations

from cortexos_studios import StudioArtifactDraft
from cortexos_types.enums import ArtifactType

DEFAULT_DESIGN_PALETTE: dict[str, str] = {
    "surface_canvas": "#0B0F17",
    "surface_elevated": "#121826",
    "surface_recessed": "#070A10",
    "ink_primary": "#F8FAFC",
    "ink_secondary": "#CBD5E1",
    "accent_primary": "#38BDF8",
    "ink_on_accent": "#082F49",
    "border_subtle": "#1E293B",
    "border_focus": "#7DD3FC",
}


class DesignSystemGenerator:
    """Generates semantic CSS variables, typography rules, motion curves, and primitives."""

    def generate(
        self,
        *,
        objective: str,
        project_id: str,
        request_id: str,
        palette: dict[str, str] | None = None,
    ) -> StudioArtifactDraft:
        tokens = {**DEFAULT_DESIGN_PALETTE, **(palette or {})}
        content = "\n".join(
            [
                f"# Design System & Token Specification — {objective}",
                "",
                f"- **Project ID**: `{project_id}`",
                f"- **Work Request ID**: `{request_id}`",
                "",
                "## 1. Semantic CSS Custom Properties",
                "```css",
                ":root {",
                f"  --cx-surface-canvas: {tokens['surface_canvas']};",
                f"  --cx-surface-elevated: {tokens['surface_elevated']};",
                f"  --cx-surface-recessed: {tokens['surface_recessed']};",
                f"  --cx-ink-primary: {tokens['ink_primary']};",
                f"  --cx-ink-secondary: {tokens['ink_secondary']};",
                f"  --cx-accent-primary: {tokens['accent_primary']};",
                f"  --cx-ink-on-accent: {tokens['ink_on_accent']};",
                f"  --cx-border-subtle: {tokens['border_subtle']};",
                f"  --cx-border-focus: {tokens['border_focus']};",
                "}",
                "@media (prefers-reduced-motion: reduce) {",
                "  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }",
                "}",
                "```",
                "",
                "## 2. Typography & Motion Scale",
                "- **Display / UI Sans**: Clean geometric grotesque (`clamp(1.25rem, 2vw, 2rem)` display, `0.9375rem` body).",
                "- **Monospace**: `JetBrains Mono` / `ui-monospace` with `tabular-nums` for telemetry and IDs.",
                "- **Motion Curve**: `cubic-bezier(0.22, 1, 0.36, 1)` at `180ms` honoring `prefers-reduced-motion`.",
            ]
        )
        return StudioArtifactDraft(
            artifact_type=ArtifactType.DESIGN_SYSTEM,
            title=f"Design System: {objective[:64]}",
            summary=f"Semantic design tokens, typography hierarchy, and reduced-motion rules for '{objective}'.",
            content=content,
            tags=["design", "design-system", "tokens"],
            metadata={
                "workRequestId": request_id,
                "activity": "DesignSystemCreation",
                "hasReducedMotionFallback": True,
                "palette": tokens,
                "toolsReferenced": ["figma", "v0"],
            },
        )
