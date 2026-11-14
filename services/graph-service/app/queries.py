from __future__ import annotations

from cortexos_types import GraphNode, GraphSubgraph
from cortexos_types.enums import RelationshipType

from app.core.security import RequestContext
from app.neo4j_client import Neo4jGraphStore
from app.schemas import GraphNodeDetailResponse, GraphPathResponse


class GraphQueryService:
    """Executes relationship queries, project graphs, cycle-safe subgraphs, and path finding."""

    def __init__(self, store: Neo4jGraphStore) -> None:
        self.store = store

    async def get_node_detail(
        self,
        node_id: str,
        ctx: RequestContext,
    ) -> GraphNodeDetailResponse | None:
        node = await self.store.get_node(node_id, ctx.organization_id)
        if node is None:
            return None

        edges = await self.store.get_node_edges(node_id, ctx.organization_id)
        neighbors: list[GraphNode] = []
        seen_neighbors: set[str] = {node_id}
        for edge in edges:
            other_id = edge.target_id if edge.source_id == node_id else edge.source_id
            if other_id in seen_neighbors:
                continue
            seen_neighbors.add(other_id)
            other_node = await self.store.get_node(other_id, ctx.organization_id)
            if other_node:
                neighbors.append(other_node)

        return GraphNodeDetailResponse(
            node=node,
            edges=edges,
            neighbors=neighbors,
        )

    async def get_project_graph(
        self,
        project_id: str,
        ctx: RequestContext,
    ) -> GraphSubgraph:
        return await self.store.get_project_subgraph(project_id, ctx.organization_id)

    async def get_subgraph(
        self,
        *,
        node_id: str,
        depth: int,
        relationship_type: RelationshipType | None,
        ctx: RequestContext,
    ) -> GraphSubgraph | None:
        return await self.store.get_subgraph(
            root_id=node_id,
            organization_id=ctx.organization_id,
            depth=depth,
            relationship_type=relationship_type,
        )

    async def find_path(
        self,
        *,
        source_id: str,
        target_id: str,
        max_depth: int,
        ctx: RequestContext,
    ) -> GraphPathResponse:
        return await self.store.find_shortest_path(
            source_id=source_id,
            target_id=target_id,
            organization_id=ctx.organization_id,
            max_depth=max_depth,
        )
