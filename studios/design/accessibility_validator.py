from __future__ import annotations

from typing import Any

from cortexos_studios import StudioArtifactDraft


def _linearize_channel(channel: int) -> float:
    srgb = channel / 255.0
    return srgb / 12.92 if srgb <= 0.03928 else ((srgb + 0.055) / 1.055) ** 2.4


def relative_luminance(hex_color: str) -> float:
    cleaned = hex_color.strip().lstrip("#")
    if len(cleaned) == 3:
        cleaned = "".join(c * 2 for c in cleaned)
    if len(cleaned) != 6:
        raise ValueError(f"Invalid hex color token: {hex_color}")
    value = int(cleaned, 16)
    r, g, b = (value >> 16) & 255, (value >> 8) & 255, value & 255
    return (
        0.2126 * _linearize_channel(r)
        + 0.7152 * _linearize_channel(g)
        + 0.0722 * _linearize_channel(b)
    )


def compute_contrast_ratio(fg_hex: str, bg_hex: str) -> float:
    l1 = relative_luminance(fg_hex)
    l2 = relative_luminance(bg_hex)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return round((lighter + 0.05) / (darker + 0.05), 2)


class AccessibilityValidator:
    """WCAG 2.1 AA luminance contrast and structural landmark validator."""

    def validate_package(
        self,
        *,
        palette: dict[str, str],
        wireframe_draft: StudioArtifactDraft | None = None,
        design_system_draft: StudioArtifactDraft | None = None,
    ) -> dict[str, Any]:
        pairs = [
            ("primary_ink_on_canvas", palette["ink_primary"], palette["surface_canvas"], 4.5),
            ("secondary_ink_on_elevated", palette["ink_secondary"], palette["surface_elevated"], 4.5),
            ("ink_on_accent", palette["ink_on_accent"], palette["accent_primary"], 4.5),
            ("focus_ring_on_canvas", palette["border_focus"], palette["surface_canvas"], 3.0),
        ]

        blockers: list[str] = []
        checks: list[dict[str, Any]] = []
        for name, fg, bg, min_ratio in pairs:
            ratio = compute_contrast_ratio(fg, bg)
            ok = ratio >= min_ratio
            if not ok:
                blockers.append(
                    f"Contrast failure for '{name}' ({fg} on {bg}): {ratio}:1 < {min_ratio}:1"
                )
            checks.append(
                {
                    "name": name,
                    "foreground": fg,
                    "background": bg,
                    "ratio": ratio,
                    "required": min_ratio,
                    "passed": ok,
                }
            )

        wf_meta = wireframe_draft.metadata if wireframe_draft else {}
        ds_meta = design_system_draft.metadata if design_system_draft else {}

        has_main = bool(wf_meta.get("hasPrimaryMainLandmark", True))
        has_kbd = bool(wf_meta.get("hasKeyboardTraversalPlan", True))
        has_states = bool(wf_meta.get("hasLoadingEmptyErrorStates", True))
        has_motion = bool(ds_meta.get("hasReducedMotionFallback", True))

        if not has_main:
            blockers.append("Missing semantic <main> landmark in wireframe specification.")
        if not has_kbd:
            blockers.append("Missing keyboard Tab/Escape focus traversal plan.")
        if not has_states:
            blockers.append("Missing loading/empty/error component state matrix.")
        if not has_motion:
            blockers.append("Missing prefers-reduced-motion fallback in design system.")

        total = len(checks) + 4
        passed_count = (
            sum(1 for c in checks if c["passed"])
            + int(has_main)
            + int(has_kbd)
            + int(has_states)
            + int(has_motion)
        )
        score = round((passed_count / max(1, total)) * 100)
        return {
            "standard": "WCAG 2.1 AA",
            "passed": len(blockers) == 0,
            "score": score,
            "checks": checks,
            "landmarks": {
                "hasPrimaryMainLandmark": has_main,
                "hasKeyboardTraversalPlan": has_kbd,
                "hasLoadingEmptyErrorStates": has_states,
                "hasReducedMotionFallback": has_motion,
            },
            "blockers": blockers,
        }
