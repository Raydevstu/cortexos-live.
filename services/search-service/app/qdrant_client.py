from __future__ import annotations

import hashlib
import logging
import math
import re
import uuid
from typing import Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, FieldCondition, Filter, MatchValue, PointStruct, VectorParams

from app.schemas import SearchHit

logger = logging.getLogger(__name__)


def deterministic_embed(text: str, *, dims: int = 384) -> list[float]:
    """Deterministic local feature-hashing embedding fallback when provider-service is offline."""
    vec = [0.0] * dims
    tokens = re.findall(r"[a-z0-9_]+", text.lower())
    if not tokens:
        return vec
    for idx, token in enumerate(tokens):
        features = [token]
        if idx + 1 < len(tokens):
            features.append(f"{token}_{tokens[idx + 1]}")
        for feat in features:
            digest = hashlib.sha256(feat.encode("utf-8")).digest()
            bucket = int.from_bytes(digest[:4], "little") % dims
            sign = 1.0 if (digest[4] & 1) == 0 else -1.0
            vec[bucket] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)


class QdrantSemanticStore:
    """Qdrant vector index adapter with deterministic in-memory fallback for local/isolated tests."""

    def __init__(
        self,
        *,
        qdrant_url: str,
        collection_name: str,
        vector_size: int = 384,
        api_key: str | None = None,
        use_in_memory_fallback: bool = True,
    ) -> None:
        self.qdrant_url = qdrant_url
        self.collection_name = collection_name
        self.vector_size = vector_size
        self.api_key = api_key
        self.use_in_memory_fallback = use_in_memory_fallback
        self._client: AsyncQdrantClient | None = None
        self._memory_points: dict[str, dict[str, Any]] = {}
        self._collection_ready = False

    def _get_client(self) -> AsyncQdrantClient:
        if self._client is None:
            self._client = AsyncQdrantClient(url=self.qdrant_url, api_key=self.api_key)
        return self._client

    async def ensure_collection(self) -> bool:
        if self._collection_ready:
            return True
        try:
            client = self._get_client()
            exists = await client.collection_exists(self.collection_name)
            if not exists:
                await client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.vector_size,
                        distance=Distance.COSINE,
                    ),
                )
            self._collection_ready = True
            return True
        except Exception as exc:
            logger.debug("Qdrant unavailable (%s); using in-memory semantic fallback", exc)
            return False

    async def upsert_chunks(
        self,
        *,
        organization_id: str,
        source_type: str,
        source_id: str,
        project_id: str | None,
        title: str | None,
        chunks: list[str],
        metadata: dict[str, Any] | None = None,
    ) -> list[str]:
        point_ids: list[str] = []
        points: list[PointStruct] = []

        for idx, chunk in enumerate(chunks):
            pid = str(
                uuid.uuid5(uuid.NAMESPACE_URL, f"cortexos:qdrant:{source_id}:{idx}")
            )
            vector = deterministic_embed(chunk, dims=self.vector_size)
            payload = {
                "organization_id": organization_id,
                "source_type": source_type,
                "source_id": source_id,
                "project_id": project_id,
                "title": title or source_id,
                "excerpt": chunk[:400],
                "chunk_index": idx,
                "metadata": dict(metadata or {}),
            }
            point_ids.append(pid)
            points.append(PointStruct(id=pid, vector=vector, payload=payload))
            self._memory_points[pid] = {"id": pid, "vector": vector, "payload": payload}

        if points and await self.ensure_collection():
            try:
                await self._get_client().upsert(
                    collection_name=self.collection_name,
                    points=points,
                )
            except Exception as exc:
                logger.warning("Qdrant upsert failed, kept in-memory index: %s", exc)

        return point_ids

    async def delete_by_source(self, source_id: str) -> int:
        removed = 0
        for pid in [k for k, v in self._memory_points.items() if v["payload"]["source_id"] == source_id]:
            del self._memory_points[pid]
            removed += 1

        if await self.ensure_collection():
            try:
                await self._get_client().delete(
                    collection_name=self.collection_name,
                    points_selector=Filter(
                        must=[
                            FieldCondition(
                                key="source_id",
                                match=MatchValue(value=source_id),
                            )
                        ]
                    ),
                )
            except Exception as exc:
                logger.debug("Qdrant delete skipped: %s", exc)
        return removed

    async def search_similar(
        self,
        *,
        query: str,
        organization_id: str,
        project_id: str | None = None,
        limit: int = 20,
    ) -> list[SearchHit]:
        query_vec = deterministic_embed(query, dims=self.vector_size)

        if await self.ensure_collection():
            try:
                conditions = [
                    FieldCondition(
                        key="organization_id",
                        match=MatchValue(value=organization_id),
                    )
                ]
                if project_id:
                    conditions.append(
                        FieldCondition(
                            key="project_id",
                            match=MatchValue(value=project_id),
                        )
                    )
                resp = await self._get_client().query_points(
                    collection_name=self.collection_name,
                    query=query_vec,
                    query_filter=Filter(must=conditions),
                    limit=limit,
                )
                return [
                    SearchHit(
                        id=str(pt.id),
                        source_type=str((pt.payload or {}).get("source_type", "artifact")),
                        source_id=str((pt.payload or {}).get("source_id", pt.id)),
                        project_id=(pt.payload or {}).get("project_id"),
                        title=(pt.payload or {}).get("title"),
                        excerpt=str((pt.payload or {}).get("excerpt", ""))[:280],
                        vector_score=round(float(pt.score), 4),
                        hybrid_score=round(float(pt.score), 4),
                        metadata=dict((pt.payload or {}).get("metadata", {})),
                    )
                    for pt in resp.points
                ]
            except Exception as exc:
                if not self.use_in_memory_fallback:
                    raise
                logger.debug("Qdrant query failed, using in-memory fallback: %s", exc)

        scored: list[SearchHit] = []
        for entry in self._memory_points.values():
            payload = entry["payload"]
            if payload["organization_id"] != organization_id:
                continue
            if project_id and payload.get("project_id") != project_id:
                continue
            sim = _cosine_similarity(query_vec, entry["vector"])
            if sim > 0:
                scored.append(
                    SearchHit(
                        id=entry["id"],
                        source_type=payload["source_type"],
                        source_id=payload["source_id"],
                        project_id=payload.get("project_id"),
                        title=payload.get("title"),
                        excerpt=payload["excerpt"][:280],
                        vector_score=round(sim, 4),
                        hybrid_score=round(sim, 4),
                        metadata=dict(payload.get("metadata", {})),
                    )
                )
        scored.sort(key=lambda h: h.vector_score, reverse=True)
        return scored[:limit]
