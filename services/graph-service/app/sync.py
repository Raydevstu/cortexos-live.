from __future__ import annotations

import uuid

from cortexos_types import GraphEdge, GraphNode
from cortexos_types.enums import GraphNodeType, RelationshipType

from app.core.security import RequestContext
from app.neo4j_client import Neo4jGraphStore
from app.schemas import GraphSyncRequest, GraphSyncResponse


class GraphSyncService:
    """Validates and idempotently synchronizes knowledge nodes & edges into Neo4j."""

    def __init__(self, store: Neo4jGraphStore) -> None:
        self.store = store

    async def sync_graph(
        self,
        payload: GraphSyncRequest,
        ctx: RequestContext,
    ) -> GraphSyncResponse:
        org_id = payload.organization_id or ctx.organization_id

        validated_nodes: dict[str, GraphNode] = {}
        for item in payload.nodes:
            node_type = (
                item.node_type
                if isinstance(item.node_type, GraphNodeType)
                else GraphNodeType(item.node_type)
            )
            validated_nodes[item.id] = GraphNode(
                id=item.id,
                label=item.label,
                node_type=node_type,
                project_id=item.project_id or payload.project_id,
                properties=dict(item.properties),
            )

        validated_edges: list[GraphEdge] = []
        for item in payload.edges:
            if item.source_id == item.target_id:
                raise ValueError(
                    f"Self-loop edges are not permitted in CortexOS graph (node={item.source_id})"
                )

            rel_type = (
                item.relationship_type
                if isinstance(item.relationship_type, RelationshipType)
                else RelationshipType(item.relationship_type)
            )
            edge_id = item.id or str(
                uuid.uuid5(
                    uuid.NAMESPACE_URL,
                    f"cortexos:edge:{item.source_id}:{rel_type.value}:{item.target_id}",
                )
            )

            # Ensure endpoint nodes referenced by Librarian (e.g., origin Artifact/Source) exist
            for endpoint_id in (item.source_id, item.target_id):
                if endpoint_id not in validated_nodes:
                    existing = await self.store.get_node(endpoint_id, org_id)
                    if existing is None:
                        validated_nodes[endpoint_id] = GraphNode(
                            id=endpoint_id,
                            label=endpoint_id,
                            node_type=GraphNodeType.ARTIFACT,
                            project_id=payload.project_id,
                            properties={"autoCreated": True},
                        )

            validated_edges.append(
                GraphEdge(
                    id=edge_id,
                    source_id=item.source_id,
                    target_id=item.target_id,
                    relationship_type=rel_type,
                    properties=dict(item.properties),
                )
            )

        node_list = list(validated_nodes.values())
        nodes_upserted, edges_upserted = await self.store.upsert_nodes_and_edges(
            organization_id=org_id,
            nodes=node_list,
            edges=validated_edges,
        )
        return GraphSyncResponse(
            nodes_upserted=nodes_upserted,
            edges_upserted=edges_upserted,
            node_ids=[n.id for n in node_list],
            edge_ids=[e.id for e in validated_edges],
        )
