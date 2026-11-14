from __future__ import annotations

import logging
from typing import Iterable

import httpx

from cortexos_types import Agent, CreateWorkRequest
from cortexos_types.enums import ProjectPhase, StudioId

from app.core.config import Settings
from app.schemas import StudioAssignmentDecision

logger = logging.getLogger(__name__)

STUDIO_KEYWORDS: list[tuple[StudioId, tuple[str, ...], str, str]] = [
    (
        StudioId.DISCOVERY,
        ("research", "market", "competitor", "discovery", "interview", "persona"),
        "gemini",
        "gemini-2.5-pro",
    ),
    (
        StudioId.PRODUCT,
        ("prd", "roadmap", "requirement", "scope", "user story", "acceptance"),
        "openai",
        "gpt-4.1",
    ),
    (
        StudioId.DESIGN,
        ("wireframe", "ui", "ux", "design", "wcag", "accessibility", "token", "layout"),
        "anthropic",
        "claude-sonnet-4",
    ),
    (
        StudioId.ARCHITECTURE,
        ("architecture", "openapi", "schema", "database", "infra", "topology", "adr"),
        "deepseek",
        "deepseek-reasoner",
    ),
    (
        StudioId.DEVELOPMENT,
        ("implement", "code", "build", "api", "refactor", "typescript", "fastapi"),
        "anthropic",
        "claude-sonnet-4",
    ),
    (
        StudioId.QA,
        ("test", "qa", "playwright", "verify", "regression", "security", "audit"),
        "ollama",
        "qwen2.5-coder:14b",
    ),
    (
        StudioId.RELEASE,
        ("release", "deploy", "canary", "rollback", "docker", "kubernetes", "helm"),
        "openrouter",
        "openrouter/auto",
    ),
]


class StudioAssignmentEngine:
    """Selects optimal Studio, Agent, and Model Provider using studio-sdk contracts."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def verify_studio_available(self, studio_id: str) -> bool:
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                resp = await client.get(f"{self._settings.studio_service_url}/api/v1/studios/{studio_id}")
                if resp.status_code == 200:
                    return True
        except Exception as exc:
            logger.debug("studio-service unreachable for lookup (%s): %s", studio_id, exc)
        return studio_id in {s.value for s in StudioId} or studio_id == "librarian"

    def assign(
        self,
        *,
        request: CreateWorkRequest,
        agents: Iterable[Agent],
        current_phase: ProjectPhase | None = None,
    ) -> StudioAssignmentDecision:
        target_studio = request.studio_id.strip().lower()
        reason = f"Explicitly targeted Studio '{target_studio}' by WorkRequest."
        provider = "anthropic"
        model = "claude-sonnet-4"

        if not target_studio or target_studio == "auto":
            lowered = request.objective.lower()
            matched_studio: StudioId | None = None
            for sid, keywords, pref_prov, pref_model in STUDIO_KEYWORDS:
                if any(kw in lowered for kw in keywords):
                    matched_studio = sid
                    provider = pref_prov
                    model = pref_model
                    reason = f"Objective matched capability keywords for '{sid.value}' Studio."
                    break
            if matched_studio is None and current_phase is not None:
                fallback_map = {
                    ProjectPhase.DISCOVERY: StudioId.DISCOVERY,
                    ProjectPhase.PRODUCT: StudioId.PRODUCT,
                    ProjectPhase.DESIGN: StudioId.DESIGN,
                    ProjectPhase.ARCHITECTURE: StudioId.ARCHITECTURE,
                    ProjectPhase.DEVELOPMENT: StudioId.DEVELOPMENT,
                    ProjectPhase.QA: StudioId.QA,
                    ProjectPhase.RELEASE: StudioId.RELEASE,
                    ProjectPhase.MAINTENANCE: StudioId.RELEASE,
                }
                matched_studio = fallback_map.get(current_phase, StudioId.DESIGN)
                reason = f"Aligned auto-assignment to active project phase '{current_phase.value}'."
            target_studio = (matched_studio or StudioId.DESIGN).value
        else:
            for sid, _, pref_prov, pref_model in STUDIO_KEYWORDS:
                if sid.value == target_studio:
                    provider = pref_prov
                    model = pref_model
                    break

        matching_agent = next(
            (a for a in agents if a.studio_id == target_studio),
            None,
        )
        agent_id = matching_agent.id if matching_agent else f"agent-{target_studio}"
        return StudioAssignmentDecision(
            studio_id=target_studio,
            agent_id=agent_id,
            reason=reason,
            preferred_provider=provider,
            preferred_model=model,
            context_artifact_ids=list(request.context_artifacts),
        )
