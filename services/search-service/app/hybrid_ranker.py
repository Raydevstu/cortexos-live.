from __future__ import annotations

import logging
from typing import Any

import httpx

from cortexos_types import (
    Artifact,
    Concept,
    Decision,
    Entity,
    SearchResponse,
)

from app.core.security import RequestContext
from app.keyword import KeywordSearchEngine
from app.qdrant_client import QdrantSemanticStore
from app.schemas import IndexChunksRequest, IndexChunksResponse, SearchHit

logger = logging.getLogger(__name__)


def fuse_hybrid_hits(
    *,
    keyword_hits: list[SearchHit],
    vector_hits: list[SearchHit],
    graph_boost_ids: set[str],
    limit: int = 20,
    rrf_k: int = 60,
) -> list[SearchHit]:
    """Reciprocal Rank Fusion + graph proximity boost combining Keyword + Vector + Graph."""
    merged: dict[str, SearchHit] = {}
    rrf_scores: dict[str, float] = {}

    for rank, hit in enumerate(keyword_hits, start=1):
        key = hit.source_id
        rrf_scores[key] = rrf_scores.get(key, 0.0) + (1.0 / (rrf_k + rank))
        if key not in merged:
            merged[key] = hit.model_copy()
        else:
            merged[key].keyword_score = max(merged[key].keyword_score, hit.keyword_score)

    for rank, hit in enumerate(vector_hits, start=1):
        key = hit.source_id
        rrf_scores[key] = rrf_scores.get(key, 0.0) + (1.2 / (rrf_k + rank))
        if key not in merged:
            merged[key] = hit.model_copy()
        else:
            merged[key].vector_score = max(merged[key].vector_score, hit.vector_score)

    for key, hit in merged.items():
        if key in graph_boost_ids:
            hit.graph_score = 1.0
            rrf_scores[key] = rrf_scores.get(key, 0.0) + 0.015
        hit.hybrid_score = round(rrf_scores.get(key, 0.0), 6)

    ranked = sorted(merged.values(), key=lambda h: h.hybrid_score, reverse=True)
    return ranked[:limit]


class HybridSearchService:
    """Executes CortexOS Hybrid Retrieval: Postgres Keyword + Qdrant Vector + Neo4j Graph."""

    def __init__(
        self,
        *,
        keyword_engine: KeywordSearchEngine,
        vector_store: QdrantSemanticStore,
        graph_service_url: str,
        timeout: float = 8.0,
    ) -> None:
        self.keyword_engine = keyword_engine
        self.vector_store = vector_store
        self.graph_service_url = graph_service_url.rstrip("/")
        self.timeout = timeout

    async def index_chunks(
        self,
        payload: IndexChunksRequest,
        ctx: RequestContext,
    ) -> IndexChunksResponse:
        org_id = payload.organization_id or ctx.organization_id
        source_type = (
            payload.source_type.value
            if hasattr(payload.source_type, "value")
            else str(payload.source_type)
        )
        for idx, chunk in enumerate(payload.chunks):
            self.keyword_engine.index_document(
                doc_id=f"{payload.source_id}:{idx}",
                organization_id=org_id,
                source_type=source_type,
                source_id=payload.source_id,
                project_id=payload.project_id,
                title=payload.title,
                text=chunk,
                metadata=payload.metadata,
            )

        embedding_ids = await self.vector_store.upsert_chunks(
            organization_id=org_id,
            source_type=source_type,
            source_id=payload.source_id,
            project_id=payload.project_id,
            title=payload.title,
            chunks=payload.chunks,
            metadata=payload.metadata,
        )
        return IndexChunksResponse(
            source_id=payload.source_id,
            indexed_count=len(embedding_ids),
            embedding_ids=embedding_ids,
        )

    async def delete_source_index(self, source_id: str) -> int:
        kw_removed = self.keyword_engine.remove_source(source_id)
        vec_removed = await self.vector_store.delete_by_source(source_id)
        return max(kw_removed, vec_removed)

    async def _fetch_graph_boost_ids(
        self,
        *,
        project_id: str | None,
        ctx: RequestContext,
    ) -> set[str]:
        if not project_id:
            return set()
        headers = {
            "x-cortex-user-id": ctx.subject_id,
            "x-cortex-org-id": ctx.organization_id,
            "x-cortex-role": ctx.role.value,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(
                    f"{self.graph_service_url}/api/v1/graph/projects/{project_id}",
                    headers=headers,
                )
                if res.is_success:
                    nodes = res.json().get("nodes", [])
                    return {str(n["id"]) for n in nodes if "id" in n}
        except Exception as exc:
            logger.debug("Graph boost lookup skipped: %s", exc)
        return set()

    async def hybrid_search(
        self,
        *,
        query: str,
        ctx: RequestContext,
        project_id: str | None = None,
        entity_type: str | None = None,
        artifact_type: str | None = None,
        limit: int = 20,
    ) -> tuple[SearchResponse, list[SearchHit]]:
        kw_hits = self.keyword_engine.search_local(
            query=query,
            organization_id=ctx.organization_id,
            project_id=project_id,
            limit=limit,
        )
        vec_hits = await self.vector_store.search_similar(
            query=query,
            organization_id=ctx.organization_id,
            project_id=project_id,
            limit=limit,
        )
        graph_boost_ids = await self._fetch_graph_boost_ids(
            project_id=project_id,
            ctx=ctx,
        )
        fused_hits = fuse_hybrid_hits(
            keyword_hits=kw_hits,
            vector_hits=vec_hits,
            graph_boost_ids=graph_boost_ids,
            limit=limit,
        )

        brain_records = await self.keyword_engine.fetch_brain_records(
            query=query,
            project_id=project_id,
            entity_type=entity_type,
            artifact_type=artifact_type,
            limit=limit,
            ctx=ctx,
        )
        artifacts = [Artifact.model_validate(a) for a in brain_records["artifacts"]]
        entities = [Entity.model_validate(e) for e in brain_records["entities"]]
        concepts = [Concept.model_validate(c) for c in brain_records["concepts"]]
        decisions = [Decision.model_validate(d) for d in brain_records["decisions"]]

        total = (
            len(fused_hits)
            + len(artifacts)
            + len(entities)
            + len(concepts)
            + len(decisions)
        )
        response = SearchResponse(
            artifacts=artifacts,
            concepts=concepts,
            entities=entities,
            decisions=decisions,
            articles=[],
            total=total,
        )
        return response, fused_hits
