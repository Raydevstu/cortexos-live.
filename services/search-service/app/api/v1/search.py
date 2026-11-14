from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, Depends, Query, status

from cortexos_types import SearchRequestParams
from cortexos_types.enums import ArtifactType, EntityType

from app.core.config import get_settings
from app.core.security import RequestContext, require_permission
from app.hybrid_ranker import HybridSearchService
from app.keyword import KeywordSearchEngine
from app.qdrant_client import QdrantSemanticStore
from app.schemas import (
    DeleteIndexResponse,
    HybridSearchResponse,
    IndexChunksRequest,
    IndexChunksResponse,
)

router = APIRouter(prefix="/search", tags=["search"])


@lru_cache
def get_search_service() -> HybridSearchService:
    settings = get_settings()
    keyword_engine = KeywordSearchEngine(
        brain_service_url=settings.brain_service_url,
    )
    vector_store = QdrantSemanticStore(
        qdrant_url=settings.qdrant_url,
        collection_name=settings.qdrant_collection,
        vector_size=settings.vector_size,
        api_key=settings.qdrant_api_key,
        use_in_memory_fallback=settings.use_in_memory_fallback,
    )
    return HybridSearchService(
        keyword_engine=keyword_engine,
        vector_store=vector_store,
        graph_service_url=settings.graph_service_url,
    )


def _build_response(
    base_response,
    hits,
) -> HybridSearchResponse:
    return HybridSearchResponse(
        artifacts=base_response.artifacts,
        concepts=base_response.concepts,
        entities=base_response.entities,
        decisions=base_response.decisions,
        articles=base_response.articles,
        total=base_response.total,
        hits=hits,
    )


@router.get("", response_model=HybridSearchResponse)
async def search_knowledge(
    query: str = Query(..., min_length=1),
    project_id: str | None = Query(default=None),
    entity_type: EntityType | None = Query(default=None),
    artifact_type: ArtifactType | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
    service: HybridSearchService = Depends(get_search_service),
) -> HybridSearchResponse:
    response, hits = await service.hybrid_search(
        query=query,
        ctx=ctx,
        project_id=project_id,
        entity_type=entity_type.value if entity_type else None,
        artifact_type=artifact_type.value if artifact_type else None,
        limit=limit,
    )
    return _build_response(response, hits)


@router.post("/query", response_model=HybridSearchResponse)
async def query_knowledge(
    payload: SearchRequestParams,
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
    service: HybridSearchService = Depends(get_search_service),
) -> HybridSearchResponse:
    response, hits = await service.hybrid_search(
        query=payload.query,
        ctx=ctx,
        project_id=payload.project_id,
        entity_type=payload.entity_type.value if payload.entity_type else None,
        artifact_type=payload.artifact_type.value if payload.artifact_type else None,
        limit=payload.limit or 20,
    )
    return _build_response(response, hits)


@router.post(
    "/index",
    response_model=IndexChunksResponse,
    status_code=status.HTTP_201_CREATED,
)
async def index_chunks(
    payload: IndexChunksRequest,
    ctx: RequestContext = Depends(require_permission("knowledge", "write")),
    service: HybridSearchService = Depends(get_search_service),
) -> IndexChunksResponse:
    return await service.index_chunks(payload, ctx)


@router.delete("/index/{source_id}", response_model=DeleteIndexResponse)
async def delete_source_index(
    source_id: str,
    _: RequestContext = Depends(require_permission("knowledge", "write")),
    service: HybridSearchService = Depends(get_search_service),
) -> DeleteIndexResponse:
    deleted = await service.delete_source_index(source_id)
    return DeleteIndexResponse(source_id=source_id, deleted_count=deleted)
