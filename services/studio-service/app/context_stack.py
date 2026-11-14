from __future__ import annotations

import logging
from typing import Any

import httpx

from cortexos_studios import StudioContextStack
from cortexos_types import Artifact, TerminalContextStack

from app.core.config import Settings, get_settings
from app.schemas import LoadedStudioProfile

logger = logging.getLogger(__name__)


class ContextStackBuilder:
    """
    Assembles the 6-layer CortexOS Context Injection Stack:
      1. User Prompt
      2. Project Context (from brain-service)
      3. Artifact Context (requested + recent project artifacts)
      4. Memory Context (studio local-memory + operational notes)
      5. Knowledge Context (semantic/keyword search results from search-service)
      6. Studio Context (charter, mission, constraints, tools, playbooks)
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    async def _fetch_project_context(self, project_id: str) -> str:
        url = f"{self.settings.brain_service_url}/api/v1/projects/{project_id}"
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    name = data.get("name", project_id)
                    phase = data.get("currentPhase") or data.get("current_phase") or "design"
                    desc = data.get("description", "")
                    return f"Project {name} ({project_id}) — phase={phase}. {desc}".strip()
        except Exception as exc:
            logger.debug("brain-service project lookup fallback for %s: %s", project_id, exc)
        return f"Project {project_id} workspace context (standalone runtime mode)."

    async def _fetch_artifacts(
        self,
        project_id: str,
        artifact_ids: list[str],
    ) -> list[Artifact]:
        hydrated: list[Artifact] = []
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                if artifact_ids:
                    for aid in artifact_ids[:10]:
                        resp = await client.get(
                            f"{self.settings.brain_service_url}/api/v1/artifacts/{aid}"
                        )
                        if resp.status_code == 200:
                            hydrated.append(Artifact.model_validate(resp.json()))
                else:
                    resp = await client.get(
                        f"{self.settings.brain_service_url}/api/v1/artifacts",
                        params={"projectId": project_id, "limit": 5},
                    )
                    if resp.status_code == 200:
                        body = resp.json()
                        items = body.get("items", body) if isinstance(body, dict) else body
                        if isinstance(items, list):
                            for item in items[:5]:
                                hydrated.append(Artifact.model_validate(item))
        except Exception as exc:
            logger.debug("brain-service artifact hydration fallback for %s: %s", project_id, exc)
        return hydrated

    async def _fetch_knowledge_snippets(
        self,
        project_id: str,
        objective: str,
    ) -> list[str]:
        snippets: list[str] = []
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                resp = await client.post(
                    f"{self.settings.search_service_url}/api/v1/search/query",
                    json={"query": objective, "projectId": project_id, "limit": 5},
                )
                if resp.status_code == 200:
                    data: dict[str, Any] = resp.json()
                    for art in data.get("artifacts", [])[:3]:
                        title = art.get("title", "Artifact")
                        summary = art.get("summary", "")
                        snippets.append(f"[Artifact] {title}: {summary}".strip())
                    for dec in data.get("decisions", [])[:2]:
                        snippets.append(f"[Decision] {dec.get('title', 'Decision')}: {dec.get('decision', '')}".strip())
                    for article in data.get("articles", [])[:2]:
                        snippets.append(f"[Wiki] {article.get('title', 'Article')}: {article.get('summary', '')}".strip())
        except Exception as exc:
            logger.debug("search-service lookup fallback for %s: %s", project_id, exc)
        return snippets

    async def build(
        self,
        *,
        profile: LoadedStudioProfile,
        project_id: str,
        objective: str,
        artifact_ids: list[str] | None = None,
        extra_constraints: list[str] | None = None,
    ) -> tuple[TerminalContextStack, StudioContextStack]:
        requested_ids = list(artifact_ids or [])
        constraints = list(dict.fromkeys([*profile.manifest.constraints, *(extra_constraints or [])]))

        project_context = await self._fetch_project_context(project_id)
        hydrated_artifacts = await self._fetch_artifacts(project_id, requested_ids)
        knowledge_snippets = await self._fetch_knowledge_snippets(project_id, objective)

        if not knowledge_snippets and profile.knowledge_doc:
            excerpt = " ".join(line.strip() for line in profile.knowledge_doc.splitlines()[:8] if line.strip())
            knowledge_snippets.append(f"[{profile.manifest.name} Knowledge] {excerpt[:360]}")

        artifact_context = [
            f"{art.id} ({art.artifact_type}): {art.title} — {art.summary}"
            for art in hydrated_artifacts
        ]
        if not artifact_context and requested_ids:
            artifact_context = [f"Referenced artifact ID: {aid}" for aid in requested_ids]

        memory_context = [
            f"[{mem.memory_type}] {mem.content}"
            for mem in profile.local_memory
        ]

        studio_context = (
            f"Studio={profile.manifest.name} (id={profile.manifest.id}, role={profile.role}); "
            f"Mission={profile.manifest.mission}; "
            f"Tools={','.join(profile.manifest.tools)}; "
            f"Skills={','.join(profile.skills)}"
        )

        terminal_stack = TerminalContextStack(
            user_prompt=objective,
            project_context=project_context,
            artifact_context=artifact_context,
            memory_context=memory_context,
            knowledge_context=knowledge_snippets,
            studio_context=studio_context,
        )

        studio_stack = StudioContextStack(
            system_identity=profile.agent_doc or f"{profile.manifest.name} ({profile.role})",
            mission=profile.manifest.mission,
            constraints=constraints,
            local_knowledge=profile.knowledge_doc,
            local_memory=list(profile.local_memory),
            context_artifacts=hydrated_artifacts,
        )

        return terminal_stack, studio_stack
