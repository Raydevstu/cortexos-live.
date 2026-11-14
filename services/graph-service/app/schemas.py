from __future__ import annotations

from typing import Any

from pydantic import Field

from cortexos_types import CortexModel, GraphEdge, GraphNode
from cortexos_types.enums import GraphNodeType, RelationshipType


class GraphSyncNodeInput(CortexModel):
    id: str
    label: str
    node_type: GraphNodeType | str
    project_id: str | None = None
    properties: dict[str, Any] = Field(default_factory=dict)


class GraphSyncEdgeInput(CortexModel):
    id: str | None = None
    source_id: str
    target_id: str
    relationship_type: RelationshipType | str
    properties: dict[str, Any] = Field(default_factory=dict)


class GraphSyncRequest(CortexModel):
    organization_id: str | None = None
    project_id: str | None = None
    nodes: list[GraphSyncNodeInput] = Field(default_factory=list)
    edges: list[GraphSyncEdgeInput] = Field(default_factory=list)


class GraphSyncResponse(CortexModel):
    nodes_upserted: int
    edges_upserted: int
    node_ids: list[str] = Field(default_factory=list)
    edge_ids: list[str] = Field(default_factory=list)


class GraphNodeDetailResponse(CortexModel):
    node: GraphNode
    edges: list[GraphEdge] = Field(default_factory=list)
    neighbors: list[GraphNode] = Field(default_factory=list)


class GraphPathResponse(CortexModel):
    source_id: str
    target_id: str
    found: bool
    hop_count: int = 0
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
