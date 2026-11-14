from __future__ import annotations

import logging
import math
import re
from collections import Counter
from typing import Any

import httpx

from app.core.security import RequestContext
from app.schemas import SearchHit

logger = logging.getLogger(__name__)


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9_]+", text.lower())


class KeywordSearchEngine:
    """Combines local lexical BM25-style document scoring with Brain Service Postgres queries."""

    def __init__(self, *, brain_service_url: str, timeout: float = 8.0) -> None:
        self.brain_service_url = brain_service_url.rstrip("/")
        self.timeout = timeout
        self._documents: dict[str, dict[str, Any]] = {}

    def index_document(
        self,
        *,
        doc_id: str,
        organization_id: str,
        source_type: str,
        source_id: str,
        project_id: str | None,
        title: str | None,
        text: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self._documents[doc_id] = {
            "id": doc_id,
            "organization_id": organization_id,
            "source_type": source_type,
            "source_id": source_id,
            "project_id": project_id,
            "title": title or source_id,
            "text": text,
            "tokens": Counter(_tokenize(f"{title or ''} {text}")),
            "length": max(1, len(_tokenize(text))),
            "metadata": dict(metadata or {}),
        }

    def remove_source(self, source_id: str) -> int:
        keys = [k for k, v in self._documents.items() if v["source_id"] == source_id]
        for key in keys:
            del self._documents[key]
        return len(keys)

    def search_local(
        self,
        *,
        query: str,
        organization_id: str,
        project_id: str | None = None,
        limit: int = 20,
    ) -> list[SearchHit]:
        q_tokens = _tokenize(query)
        if not q_tokens:
            return []

        corpus = [
            doc
            for doc in self._documents.values()
            if doc["organization_id"] == organization_id
            and (project_id is None or doc["project_id"] == project_id)
        ]
        if not corpus:
            return []

        avg_len = sum(d["length"] for d in corpus) / max(1, len(corpus))
        doc_count = len(corpus)
        hits: list[SearchHit] = []

        for doc in corpus:
            score = 0.0
            tf_map: Counter[str] = doc["tokens"]
            for term in set(q_tokens):
                tf = tf_map.get(term, 0)
                if tf == 0:
                    continue
                df = sum(1 for d in corpus if d["tokens"].get(term, 0) > 0)
                idf = math.log(1.0 + (doc_count - df + 0.5) / (df + 0.5))
                k1, b = 1.2, 0.75
                denom = tf + k1 * (1.0 - b + b * (doc["length"] / avg_len))
                score += idf * ((tf * (k1 + 1.0)) / max(1e-6, denom))

            if score > 0:
                hits.append(
                    SearchHit(
                        id=doc["id"],
                        source_type=doc["source_type"],
                        source_id=doc["source_id"],
                        project_id=doc["project_id"],
                        title=doc["title"],
                        excerpt=doc["text"][:280],
                        keyword_score=round(score, 4),
                        hybrid_score=round(score, 4),
                        metadata=doc["metadata"],
                    )
                )

        hits.sort(key=lambda h: h.keyword_score, reverse=True)
        return hits[:limit]

    async def fetch_brain_records(
        self,
        *,
        query: str,
        project_id: str | None,
        entity_type: str | None,
        artifact_type: str | None,
        limit: int,
        ctx: RequestContext,
    ) -> dict[str, list[dict[str, Any]]]:
        headers = {
            "x-cortex-user-id": ctx.subject_id,
            "x-cortex-org-id": ctx.organization_id,
            "x-cortex-role": ctx.role.value,
        }
        q_lower = query.strip().lower()
        results: dict[str, list[dict[str, Any]]] = {
            "artifacts": [],
            "entities": [],
            "concepts": [],
            "decisions": [],
        }

        def _matches(item: dict[str, Any], *fields: str) -> bool:
            if not q_lower:
                return True
            return any(q_lower in str(item.get(f, "")).lower() for f in fields)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                art_params: dict[str, Any] = {"limit": limit}
                if project_id:
                    art_params["project_id"] = project_id
                if artifact_type:
                    art_params["artifact_type"] = artifact_type
                res = await client.get(
                    f"{self.brain_service_url}/api/v1/artifacts",
                    params=art_params,
                    headers=headers,
                )
                if res.is_success:
                    results["artifacts"] = [
                        a
                        for a in res.json().get("items", [])
                        if _matches(a, "title", "summary", "artifactType")
                    ]

                ent_params: dict[str, Any] = {"limit": limit}
                if entity_type:
                    ent_params["entity_type"] = entity_type
                res = await client.get(
                    f"{self.brain_service_url}/api/v1/entities",
                    params=ent_params,
                    headers=headers,
                )
                if res.is_success:
                    results["entities"] = [
                        e
                        for e in res.json().get("items", [])
                        if _matches(e, "name", "description", "entityType")
                    ]

                res = await client.get(
                    f"{self.brain_service_url}/api/v1/concepts",
                    params={"limit": limit},
                    headers=headers,
                )
                if res.is_success:
                    results["concepts"] = [
                        c
                        for c in res.json().get("items", [])
                        if _matches(c, "name", "description", "domain")
                    ]

                dec_params: dict[str, Any] = {"limit": limit}
                if project_id:
                    dec_params["project_id"] = project_id
                res = await client.get(
                    f"{self.brain_service_url}/api/v1/decisions",
                    params=dec_params,
                    headers=headers,
                )
                if res.is_success:
                    results["decisions"] = [
                        d
                        for d in res.json().get("items", [])
                        if _matches(d, "title", "context", "decision")
                    ]
        except Exception as exc:
            logger.debug("Brain keyword lookup skipped: %s", exc)

        return results
