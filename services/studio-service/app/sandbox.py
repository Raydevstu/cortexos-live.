from __future__ import annotations

import re

from cortexos_types import WorkRequest

DISALLOWED_CROSS_PROJECT_PATTERN = re.compile(r"\.\./|rm\s+-rf\s+/|/etc/passwd", re.IGNORECASE)


class StudioSandboxGuard:
    """Isolates project workspaces and validates safe Studio execution boundaries."""

    def validate_request(self, studio_id: str, request: WorkRequest) -> None:
        if request.studio_id != studio_id:
            raise ValueError(
                f"WorkRequest studio_id '{request.studio_id}' does not match target '{studio_id}'."
            )
        if not request.project_id.strip():
            raise ValueError("WorkRequest must include a non-empty project_id for workspace isolation.")
        combined = " ".join([request.objective, *request.constraints])
        if DISALLOWED_CROSS_PROJECT_PATTERN.search(combined):
            raise ValueError("Unsafe filesystem or cross-project traversal detected in WorkRequest.")
