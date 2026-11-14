from __future__ import annotations

from typing import Any

from pydantic import Field

from cortexos_types import CortexModel, SearchResponse
from cortexos_types.enums import SearchSourceType


class IndexChunksRequest(CortexModel):
    organization_id: str | None = None
    source_type: SearchSourceType | str
    source_id: str
    project_id: str | None = None
    title: str | None = None
    chunks: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class IndexChunksResponse(CortexModel):
    source_id: str
    indexed_count: int
    embedding_ids: list[str] = Field(default_factory=list)


class DeleteIndexResponse(CortexModel):
    source_id: str
    deleted_count: int


class SearchHit(CortexModel):
    id: str
    source_type: str
    source_id: str
    project_id: str | None = None
    title: str | None = None
    excerpt: str
    keyword_score: float = 0.0
    vector_score: float = 0.0
    graph_score: float = 0.0
    hybrid_score: float = 0.0
    metadata: dict[str, Any] = Field(default_factory=dict)


class HybridSearchResponse(SearchResponse):
    hits: list[SearchHit] = Field(default_factory=list)
