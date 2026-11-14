from __future__ import annotations

import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from cortexos_studios import Studio
from cortexos_types import AgentMemory, Studio as StudioModel, StudioManifest
from cortexos_types.enums import StudioStatus


def parse_manifest_yaml(raw: str) -> dict[str, Any]:
    """Lightweight dependency-free YAML parser covering CortexOS studio manifest.yaml files."""
    result: dict[str, Any] = {}
    current_key: str | None = None

    for raw_line in raw.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if stripped.startswith("- ") and current_key is not None:
            existing = result.get(current_key)
            if not isinstance(existing, list):
                existing = []
                result[current_key] = existing
            existing.append(stripped[2:].strip().strip("'\""))
            continue

        if ":" in stripped:
            key, val = stripped.split(":", 1)
            key = key.strip()
            val = val.strip()
            if val == "":
                result[key] = []
                current_key = key
            elif val.startswith("[") and val.endswith("]"):
                inner = val[1:-1].strip()
                result[key] = (
                    [item.strip().strip("'\"") for item in inner.split(",") if item.strip()]
                    if inner
                    else []
                )
                current_key = None
            else:
                result[key] = val.strip("'\"")
                current_key = None

    return result


class StudioLoader:
    """Discovers studios/*/manifest.yaml packages and dynamically loads runnable Studio classes."""

    def __init__(self, studios_dir: str | Path) -> None:
        self.studios_dir = Path(studios_dir)

    def _read_optional_text(self, path: Path) -> str:
        return path.read_text(encoding="utf-8") if path.exists() else ""

    def _list_md_names(self, folder: Path) -> list[str]:
        if not folder.exists():
            return []
        return sorted(p.stem for p in folder.glob("*.md"))

    def _read_local_memory(self, folder: Path) -> list[AgentMemory]:
        mem_file = folder / "memory" / "local-memory.json"
        if not mem_file.exists():
            return []
        try:
            data = json.loads(mem_file.read_text(encoding="utf-8"))
            if isinstance(data, list):
                return [AgentMemory.model_validate(item) for item in data]
        except Exception:
            return []
        return []

    def _load_runtime_instance(self, studio_dir: Path, studio_id: str) -> Studio | None:
        module_file = studio_dir / f"{studio_id}_studio.py"
        if not module_file.exists():
            return None

        dir_str = str(studio_dir)
        if dir_str not in sys.path:
            sys.path.insert(0, dir_str)

        spec = importlib.util.spec_from_file_location(
            f"cortexos_studio_{studio_id}", module_file
        )
        if spec is None or spec.loader is None:
            return None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        for attr_name in dir(module):
            attr = getattr(module, attr_name)
            if (
                isinstance(attr, type)
                and issubclass(attr, Studio)
                and attr is not Studio
                and not getattr(attr, "__abstractmethods__", None)
            ):
                return attr(studio_dir=studio_dir)
        return None

    def discover_all(self) -> list[tuple[Any, Studio | None]]:
        if not self.studios_dir.exists():
            return []

        from app.schemas import LoadedStudioProfile

        now = datetime.now(timezone.utc)
        loaded: list[tuple[LoadedStudioProfile, Studio | None]] = []

        for child in sorted(self.studios_dir.iterdir()):
            if not child.is_dir():
                continue
            manifest_path = child / "manifest.yaml"
            if not manifest_path.exists():
                continue

            raw_manifest = parse_manifest_yaml(manifest_path.read_text(encoding="utf-8"))
            studio_id = str(raw_manifest.get("id") or child.name)
            mission = str(
                raw_manifest.get("mission")
                or self._read_optional_text(child / "mission.md").strip()
                or f"{studio_id} studio charter"
            )
            manifest = StudioManifest(
                id=studio_id,
                name=str(raw_manifest.get("name") or f"{studio_id.title()} Studio"),
                version=str(raw_manifest.get("version") or "0.1.0"),
                mission=mission,
                capabilities=list(raw_manifest.get("capabilities") or []),
                supported_artifacts=list(raw_manifest.get("supported_artifacts") or []),
                tools=list(raw_manifest.get("tools") or []),
                constraints=list(raw_manifest.get("constraints") or []),
            )

            runtime_instance = self._load_runtime_instance(child, studio_id)
            implemented = runtime_instance is not None
            studio_model = StudioModel(
                id=studio_id,
                name=manifest.name,
                version=manifest.version,
                mission=manifest.mission,
                enabled=implemented,
                status=StudioStatus.ACTIVE if implemented else StudioStatus.MAINTENANCE,
                manifest=manifest,
                created_at=now,
                updated_at=now,
            )
            profile = LoadedStudioProfile(
                studio=studio_model,
                manifest=manifest,
                role=str(raw_manifest.get("role") or "Specialist"),
                implemented=implemented,
                agent_doc=self._read_optional_text(child / "agent.md"),
                mission_doc=self._read_optional_text(child / "mission.md"),
                knowledge_doc=self._read_optional_text(child / "knowledge.md"),
                constraints_doc=self._read_optional_text(child / "constraints.md"),
                skills=self._list_md_names(child / "skills"),
                templates=self._list_md_names(child / "templates"),
                playbooks=self._list_md_names(child / "playbooks"),
                local_memory=self._read_local_memory(child),
            )
            loaded.append((profile, runtime_instance))

        return loaded
