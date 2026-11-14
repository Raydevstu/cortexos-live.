from __future__ import annotations

from cortexos_studios import Studio
from cortexos_types import StudioManifest

from app.schemas import LoadedStudioProfile
from app.tools_registry import StudioToolRegistry


class StudioRegistry:
    """In-memory catalog of discovered Studio manifests, profiles, tools, and runnable instances."""

    def __init__(self, tool_registry: StudioToolRegistry | None = None) -> None:
        self._profiles: dict[str, LoadedStudioProfile] = {}
        self._instances: dict[str, Studio] = {}
        self.tool_registry = tool_registry or StudioToolRegistry()

    def register(
        self,
        profile: LoadedStudioProfile,
        instance: Studio | None = None,
    ) -> None:
        studio_id = profile.studio.id
        self._profiles[studio_id] = profile
        self.tool_registry.register_manifest(profile.manifest)
        if instance is not None:
            self._instances[studio_id] = instance

    async def initialize_runnable_studios(self) -> None:
        for studio in self._instances.values():
            await studio.initialize()

    def list_profiles(self) -> list[LoadedStudioProfile]:
        return [self._profiles[sid] for sid in sorted(self._profiles.keys())]

    def list_manifests(self) -> list[StudioManifest]:
        return [self._profiles[sid].manifest for sid in sorted(self._profiles.keys())]

    def get_profile(self, studio_id: str) -> LoadedStudioProfile | None:
        return self._profiles.get(studio_id)

    def get_instance(self, studio_id: str) -> Studio | None:
        return self._instances.get(studio_id)

    def is_implemented(self, studio_id: str) -> bool:
        return studio_id in self._instances

    def count_implemented(self) -> int:
        return len(self._instances)
