from __future__ import annotations

from cortexos_types import StudioManifest


class StudioToolRegistry:
    """Validates and exposes allowlisted tools declared in each StudioManifest."""

    def __init__(self) -> None:
        self._studio_tools: dict[str, tuple[str, ...]] = {}

    def register_manifest(self, manifest: StudioManifest) -> None:
        self._studio_tools[manifest.id] = tuple(manifest.tools)

    def list_tools(self, studio_id: str) -> list[str]:
        return list(self._studio_tools.get(studio_id, ()))

    def is_tool_allowed(self, studio_id: str, tool_id: str) -> bool:
        return tool_id in self._studio_tools.get(studio_id, ())
