from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, Query, status

from cortexos_types import GraphSubgraph
from cortexos_types.enums import RelationshipType

from app.core.config import get_settings
from app.core.security import RequestContext, require_permission
from app.neo4j_client import Neo4jGraphStore
from app.queries import GraphQueryService
from app.schemas import (
    GraphNodeDetailResponse,
    GraphPathResponse,
    GraphSyncRequest,
    GraphSyncResponse,
)
from app.sync import GraphSyncService

router = APIRouter(prefix="/graph", tags=["graph"])


@lru_cache
def get_graph_store() -> Neo4jGraphStore:
    settings = get_settings()
    return Neo4jGraphStore(
        neo4j_uri=settings.neo4j_uri,
        neo4j_user=settings.neo4j_user,
        neo4j_password=settings.neo4j_password,
        neo4j_database=settings.neo4j_database,
        max_traversal_depth=settings.max_traversal_depth,
        use_in_memory_fallback=settings.use_in_memory_fallback,
    )


def get_graph_sync_service() -> GraphSyncService:
    return GraphSyncService(get_graph_store())


def get_graph_query_service() -> GraphQueryService:
    return GraphQueryService(get_graph_store())


@router.get("/nodes/{node_id}", response_model=GraphNodeDetailResponse)
async def get_graph_node(
    node_id: str,
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
    queries: GraphQueryService = Depends(get_graph_query_service),
) -> GraphNodeDetailResponse:
    detail = await queries.get_node_detail(node_id, ctx)
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Graph node '{node_id}' not found",
        )
    return detail


@router.get("/projects/{project_id}", response_model=GraphSubgraph)
async def get_project_graph(
    project_id: str,
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
    queries: GraphQueryService = Depends(get_graph_query_service),
) -> GraphSubgraph:
    return await queries.get_project_graph(project_id, ctx)


@router.get("/subgraph/{node_id}", response_model=GraphSubgraph)
async def get_subgraph(
    node_id: str,
    depth: int = Query(default=2, ge=1, le=4),
    relationship_type: RelationshipType | None = Query(default=None),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
    queries: GraphQueryService = Depends(get_graph_query_service),
) -> GraphSubgraph:
    subgraph = await queries.get_subgraph(
        node_id=node_id,
        depth=depth,
        relationship_type=relationship_type,
        ctx=ctx,
    )
    if subgraph is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Root graph node '{node_id}' not found",
        )
    return subgraph


@router.get("/path", response_model=GraphPathResponse)
async def find_graph_path(
    source_id: str = Query(..., min_length=1),
    target_id: str = Query(..., min_length=1),
    max_depth: int = Query(default=4, ge=1, le=6),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
    queries: GraphQueryService = Depends(get_graph_query_service),
) -> GraphPathResponse:
    return await queries.find_path(
        source_id=source_id,
        target_id=target_id,
        max_depth=max_depth,
        ctx=ctx,
    )


@router.post("/sync", response_model=GraphSyncResponse)
async def sync_graph(
    payload: GraphSyncRequest,
    ctx: RequestContext = Depends(require_permission("knowledge", "write")),
    sync_service: GraphSyncService = Depends(get_graph_sync_service),
) -> GraphSyncResponse:
    try:
        return await sync_service.sync_graph(payload, ctx)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
