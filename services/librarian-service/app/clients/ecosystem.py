from __future__ import annotations

import logging
from typing import Any, Protocol

import httpx

from cortexos_types import (
    Artifact,
    Concept,
    Decision,
    Doctrine,
    Entity,
    KnowledgeArticle,
    MainBrainContext,
    Pattern,
    Project,
    Relationship,
)

from app.core.security import RequestContext

logger = logging.getLogger(__name__)


class EcosystemClient(Protocol):
    async def persist_entity(self, entity: Entity, ctx: RequestContext) -> Entity: ...

    async def persist_concept(self, concept: Concept, ctx: RequestContext) -> Concept: ...

    async def persist_pattern(self, pattern: Pattern, ctx: RequestContext) -> Pattern: ...

    async def persist_doctrine(self, doctrine: Doctrine, ctx: RequestContext) -> Doctrine: ...

    async def persist_relationship(
        self, relationship: Relationship, ctx: RequestContext
    ) -> Relationship: ...

    async def sync_graph(
        self,
        *,
        entities: list[Entity],
        concepts: list[Concept],
        patterns: list[Pattern],
        relationships: list[Relationship],
        ctx: RequestContext,
    ) -> None: ...

    async def index_search_chunks(
        self,
        *,
        source_type: str,
        source_id: str,
        project_id: str | None,
        chunks: list[str],
        ctx: RequestContext,
    ) -> int: ...

    async def fetch_mainbrain_snapshot(
        self,
        *,
        project_id: str | None,
        ctx: RequestContext,
    ) -> MainBrainContext: ...


class HttpEcosystemClient:
    """Async HTTP client coordinating persistence & indexing across Brain, Graph, and Search."""

    def __init__(
        self,
        *,
        brain_url: str,
        graph_url: str,
        search_url: str,
        timeout: float = 10.0,
    ) -> None:
        self.brain_url = brain_url.rstrip("/")
        self.graph_url = graph_url.rstrip("/")
        self.search_url = search_url.rstrip("/")
        self.timeout = timeout

    @staticmethod
    def _headers(ctx: RequestContext) -> dict[str, str]:
        return {
            "x-cortex-user-id": ctx.subject_id,
            "x-cortex-org-id": ctx.organization_id,
            "x-cortex-role": ctx.role.value,
        }

    async def _post_json(
        self, url: str, payload: dict[str, Any], ctx: RequestContext
    ) -> dict[str, Any] | None:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=self._headers(ctx))
                if response.is_success:
                    return response.json()
                logger.warning("Downstream POST %s returned %s", url, response.status_code)
        except Exception as exc:
            logger.warning("Downstream POST %s failed: %s", url, exc)
        return None

    async def _get_json(self, url: str, ctx: RequestContext) -> dict[str, Any] | None:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._headers(ctx))
                if response.is_success:
                    return response.json()
        except Exception as exc:
            logger.warning("Downstream GET %s failed: %s", url, exc)
        return None

    async def persist_entity(self, entity: Entity, ctx: RequestContext) -> Entity:
        data = await self._post_json(
            f"{self.brain_url}/api/v1/entities",
            {
                "organizationId": ctx.organization_id,
                "name": entity.name,
                "entityType": entity.entity_type,
                "description": entity.description,
                "aliases": entity.aliases,
                "tags": entity.tags,
            },
            ctx,
        )
        return Entity.model_validate(data) if data else entity

    async def persist_concept(self, concept: Concept, ctx: RequestContext) -> Concept:
        data = await self._post_json(
            f"{self.brain_url}/api/v1/concepts",
            {
                "organizationId": ctx.organization_id,
                "name": concept.name,
                "description": concept.description,
                "domain": concept.domain,
                "keywords": concept.keywords,
                "tags": concept.tags,
            },
            ctx,
        )
        return Concept.model_validate(data) if data else concept

    async def persist_pattern(self, pattern: Pattern, ctx: RequestContext) -> Pattern:
        data = await self._post_json(
            f"{self.brain_url}/api/v1/patterns",
            {
                "organizationId": ctx.organization_id,
                "name": pattern.name,
                "category": pattern.category,
                "description": pattern.description,
                "reusabilityScore": pattern.reusability_score,
                "tags": pattern.tags,
            },
            ctx,
        )
        return Pattern.model_validate(data) if data else pattern

    async def persist_doctrine(self, doctrine: Doctrine, ctx: RequestContext) -> Doctrine:
        data = await self._post_json(
            f"{self.brain_url}/api/v1/doctrines",
            {
                "organizationId": ctx.organization_id,
                "name": doctrine.name,
                "description": doctrine.description,
                "sourcePatternId": doctrine.source_pattern_id,
                "approvedBy": doctrine.approved_by,
                "tags": doctrine.tags,
            },
            ctx,
        )
        return Doctrine.model_validate(data) if data else doctrine

    async def persist_relationship(
        self, relationship: Relationship, ctx: RequestContext
    ) -> Relationship:
        data = await self._post_json(
            f"{self.brain_url}/api/v1/relationships",
            {
                "organizationId": ctx.organization_id,
                "sourceId": relationship.source_id,
                "targetId": relationship.target_id,
                "relationshipType": relationship.relationship_type,
                "weight": relationship.weight or 1.0,
                "confidence": relationship.confidence or 1.0,
            },
            ctx,
        )
        return Relationship.model_validate(data) if data else relationship

    async def sync_graph(
        self,
        *,
        entities: list[Entity],
        concepts: list[Concept],
        patterns: list[Pattern],
        relationships: list[Relationship],
        ctx: RequestContext,
    ) -> None:
        await self._post_json(
            f"{self.graph_url}/api/v1/graph/sync",
            {
                "nodes": [
                    *[{"id": e.id, "label": e.name, "nodeType": "Entity"} for e in entities],
                    *[{"id": c.id, "label": c.name, "nodeType": "Concept"} for c in concepts],
                    *[{"id": p.id, "label": p.name, "nodeType": "Pattern"} for p in patterns],
                ],
                "edges": [
                    {
                        "id": r.id,
                        "sourceId": r.source_id,
                        "targetId": r.target_id,
                        "relationshipType": r.relationship_type,
                    }
                    for r in relationships
                ],
            },
            ctx,
        )

    async def index_search_chunks(
        self,
        *,
        source_type: str,
        source_id: str,
        project_id: str | None,
        chunks: list[str],
        ctx: RequestContext,
    ) -> int:
        if not chunks:
            return 0
        await self._post_json(
            f"{self.search_url}/api/v1/search/index",
            {
                "organizationId": ctx.organization_id,
                "sourceType": source_type,
                "sourceId": source_id,
                "projectId": project_id,
                "chunks": chunks,
            },
            ctx,
        )
        return len(chunks)

    async def fetch_mainbrain_snapshot(
        self,
        *,
        project_id: str | None,
        ctx: RequestContext,
    ) -> MainBrainContext:
        project: Project | None = None
        if project_id:
            p_data = await self._get_json(f"{self.brain_url}/api/v1/projects/{project_id}", ctx)
            if p_data:
                project = Project.model_validate(p_data)

        artifacts_data = await self._get_json(
            f"{self.brain_url}/api/v1/artifacts" + (f"?project_id={project_id}" if project_id else ""),
            ctx,
        )
        entities_data = await self._get_json(f"{self.brain_url}/api/v1/entities", ctx)
        concepts_data = await self._get_json(f"{self.brain_url}/api/v1/concepts", ctx)
        decisions_data = await self._get_json(
            f"{self.brain_url}/api/v1/decisions" + (f"?project_id={project_id}" if project_id else ""),
            ctx,
        )
        patterns_data = await self._get_json(f"{self.brain_url}/api/v1/patterns", ctx)
        rels_data = await self._get_json(f"{self.brain_url}/api/v1/relationships", ctx)

        return MainBrainContext(
            project=project,
            artifacts=[Artifact.model_validate(x) for x in (artifacts_data or {}).get("items", [])],
            decisions=[Decision.model_validate(x) for x in (decisions_data or {}).get("items", [])],
            concepts=[Concept.model_validate(x) for x in (concepts_data or {}).get("items", [])],
            entities=[Entity.model_validate(x) for x in (entities_data or {}).get("items", [])],
            patterns=[Pattern.model_validate(x) for x in (patterns_data or {}).get("items", [])],
            articles=[],
            relationships=[Relationship.model_validate(x) for x in (rels_data or {}).get("items", [])],
        )
