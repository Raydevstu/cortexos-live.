from __future__ import annotations

import logging
from collections import deque
from typing import Any

from neo4j import AsyncDriver, AsyncGraphDatabase

from cortexos_types import GraphEdge, GraphNode, GraphSubgraph
from cortexos_types.enums import GraphNodeType, RelationshipType

from app.schemas import GraphPathResponse

logger = logging.getLogger(__name__)


class Neo4jGraphStore:
    """Async Neo4j property-graph adapter with cycle-safe in-memory fallback."""

    def __init__(
        self,
        *,
        neo4j_uri: str,
        neo4j_user: str,
        neo4j_password: str,
        neo4j_database: str = "neo4j",
        max_traversal_depth: int = 4,
        use_in_memory_fallback: bool = True,
    ) -> None:
        self.neo4j_uri = neo4j_uri
        self.neo4j_user = neo4j_user
        self.neo4j_password = neo4j_password
        self.neo4j_database = neo4j_database
        self.max_traversal_depth = max(1, max_traversal_depth)
        self.use_in_memory_fallback = use_in_memory_fallback

        self._driver: AsyncDriver | None = None
        self._neo4j_available: bool = False
        self._constraints_initialized: bool = False

        # In-memory fallback stores keyed by node_id / edge_id
        self._memory_nodes: dict[str, tuple[str, GraphNode]] = {}
        self._memory_edges: dict[str, tuple[str, GraphEdge]] = {}

    def _get_driver(self) -> AsyncDriver:
        if self._driver is None:
            self._driver = AsyncGraphDatabase.driver(
                self.neo4j_uri,
                auth=(self.neo4j_user, self.neo4j_password),
            )
        return self._driver

    async def verify_connectivity(self) -> bool:
        try:
            driver = self._get_driver()
            await driver.verify_connectivity()
            if not self._constraints_initialized:
                async with driver.session(database=self.neo4j_database) as session:
                    await session.run(
                        "CREATE CONSTRAINT cortex_node_id IF NOT EXISTS "
                        "FOR (n:CortexNode) REQUIRE n.id IS UNIQUE"
                    )
                    await session.run(
                        "CREATE INDEX cortex_node_project IF NOT EXISTS "
                        "FOR (n:CortexNode) ON (n.organization_id, n.project_id)"
                    )
                self._constraints_initialized = True
            self._neo4j_available = True
            return True
        except Exception as exc:
            self._neo4j_available = False
            if not self.use_in_memory_fallback:
                raise
            logger.debug("Neo4j unavailable (%s); using in-memory graph store", exc)
            return False

    async def close(self) -> None:
        if self._driver is not None:
            await self._driver.close()
            self._driver = None
            self._neo4j_available = False

    @staticmethod
    def _record_to_node(raw: dict[str, Any]) -> GraphNode:
        reserved = {"id", "label", "node_type", "project_id", "organization_id"}
        extra_props = {k: v for k, v in raw.items() if k not in reserved}
        return GraphNode(
            id=str(raw["id"]),
            label=str(raw.get("label", raw["id"])),
            node_type=GraphNodeType(str(raw["node_type"])),
            project_id=raw.get("project_id"),
            properties=extra_props,
        )

    @staticmethod
    def _record_to_edge(raw: dict[str, Any], source_id: str, target_id: str) -> GraphEdge:
        reserved = {"id", "relationship_type", "organization_id"}
        extra_props = {k: v for k, v in raw.items() if k not in reserved}
        return GraphEdge(
            id=str(raw["id"]),
            source_id=source_id,
            target_id=target_id,
            relationship_type=RelationshipType(str(raw["relationship_type"])),
            properties=extra_props,
        )

    async def upsert_nodes_and_edges(
        self,
        *,
        organization_id: str,
        nodes: list[GraphNode],
        edges: list[GraphEdge],
    ) -> tuple[int, int]:
        for node in nodes:
            existing = self._memory_nodes.get(node.id)
            if existing:
                merged_props = {**existing[1].properties, **node.properties}
                merged_node = node.model_copy(
                    update={
                        "project_id": node.project_id or existing[1].project_id,
                        "properties": merged_props,
                    }
                )
                self._memory_nodes[node.id] = (organization_id, merged_node)
            else:
                self._memory_nodes[node.id] = (organization_id, node)

        for edge in edges:
            self._memory_edges[edge.id] = (organization_id, edge)

        if await self.verify_connectivity():
            driver = self._get_driver()
            async with driver.session(database=self.neo4j_database) as session:
                if nodes:
                    node_rows = [
                        {
                            "id": n.id,
                            "label": n.label,
                            "node_type": n.node_type.value,
                            "project_id": n.project_id,
                            "properties": {
                                k: v
                                for k, v in n.properties.items()
                                if isinstance(v, (str, int, float, bool))
                            },
                        }
                        for n in nodes
                    ]
                    await session.run(
                        """
                        UNWIND $rows AS row
                        MERGE (n:CortexNode {id: row.id})
                        SET n.label = row.label,
                            n.node_type = row.node_type,
                            n.project_id = coalesce(row.project_id, n.project_id),
                            n.organization_id = $org_id,
                            n += row.properties
                        """,
                        rows=node_rows,
                        org_id=organization_id,
                    )
                if edges:
                    edge_rows = [
                        {
                            "id": e.id,
                            "source_id": e.source_id,
                            "target_id": e.target_id,
                            "relationship_type": e.relationship_type.value,
                            "properties": {
                                k: v
                                for k, v in e.properties.items()
                                if isinstance(v, (str, int, float, bool))
                            },
                        }
                        for e in edges
                    ]
                    await session.run(
                        """
                        UNWIND $rows AS row
                        MATCH (s:CortexNode {id: row.source_id})
                        MATCH (t:CortexNode {id: row.target_id})
                        MERGE (s)-[r:RELATES_TO {id: row.id}]->(t)
                        SET r.relationship_type = row.relationship_type,
                            r.organization_id = $org_id,
                            r += row.properties
                        """,
                        rows=edge_rows,
                        org_id=organization_id,
                    )

        return len(nodes), len(edges)

    async def get_node(self, node_id: str, organization_id: str) -> GraphNode | None:
        if await self.verify_connectivity():
            driver = self._get_driver()
            async with driver.session(database=self.neo4j_database) as session:
                result = await session.run(
                    """
                    MATCH (n:CortexNode {id: $node_id, organization_id: $org_id})
                    RETURN properties(n) AS props
                    LIMIT 1
                    """,
                    node_id=node_id,
                    org_id=organization_id,
                )
                record = await result.single()
                if record:
                    return self._record_to_node(record["props"])
                return None

        entry = self._memory_nodes.get(node_id)
        if entry and entry[0] == organization_id:
            return entry[1]
        return None

    async def get_node_edges(
        self,
        node_id: str,
        organization_id: str,
    ) -> list[GraphEdge]:
        if await self.verify_connectivity():
            driver = self._get_driver()
            async with driver.session(database=self.neo4j_database) as session:
                result = await session.run(
                    """
                    MATCH (s:CortexNode {organization_id: $org_id})
                          -[r:RELATES_TO {organization_id: $org_id}]->
                          (t:CortexNode {organization_id: $org_id})
                    WHERE s.id = $node_id OR t.id = $node_id
                    RETURN properties(r) AS rel, s.id AS source_id, t.id AS target_id
                    """,
                    node_id=node_id,
                    org_id=organization_id,
                )
                edges: list[GraphEdge] = []
                async for rec in result:
                    edges.append(
                        self._record_to_edge(
                            rec["rel"], rec["source_id"], rec["target_id"]
                        )
                    )
                return edges

        return [
            edge
            for org_id, edge in self._memory_edges.values()
            if org_id == organization_id
            and (edge.source_id == node_id or edge.target_id == node_id)
        ]

    async def get_project_subgraph(
        self,
        project_id: str,
        organization_id: str,
    ) -> GraphSubgraph:
        if await self.verify_connectivity():
            driver = self._get_driver()
            async with driver.session(database=self.neo4j_database) as session:
                node_res = await session.run(
                    """
                    MATCH (n:CortexNode {organization_id: $org_id, project_id: $project_id})
                    RETURN properties(n) AS props
                    """,
                    org_id=organization_id,
                    project_id=project_id,
                )
                nodes_by_id: dict[str, GraphNode] = {}
                async for rec in node_res:
                    node = self._record_to_node(rec["props"])
                    nodes_by_id[node.id] = node

                edge_res = await session.run(
                    """
                    MATCH (s:CortexNode {organization_id: $org_id, project_id: $project_id})
                          -[r:RELATES_TO {organization_id: $org_id}]-
                          (t:CortexNode {organization_id: $org_id})
                    RETURN properties(r) AS rel,
                           startNode(r).id AS source_id,
                           endNode(r).id AS target_id,
                           properties(t) AS target_props
                    """,
                    org_id=organization_id,
                    project_id=project_id,
                )
                edges_by_id: dict[str, GraphEdge] = {}
                async for rec in edge_res:
                    t_node = self._record_to_node(rec["target_props"])
                    nodes_by_id[t_node.id] = t_node
                    edge = self._record_to_edge(
                        rec["rel"], rec["source_id"], rec["target_id"]
                    )
                    edges_by_id[edge.id] = edge

                return GraphSubgraph(
                    root_id=project_id,
                    nodes=list(nodes_by_id.values()),
                    edges=list(edges_by_id.values()),
                )

        seed_ids = {
            node.id
            for org_id, node in self._memory_nodes.values()
            if org_id == organization_id and node.project_id == project_id
        }
        nodes_by_id: dict[str, GraphNode] = {
            nid: self._memory_nodes[nid][1] for nid in seed_ids
        }
        edges_by_id: dict[str, GraphEdge] = {}

        for org_id, edge in self._memory_edges.values():
            if org_id != organization_id:
                continue
            if edge.source_id in seed_ids or edge.target_id in seed_ids:
                edges_by_id[edge.id] = edge
                for endpoint_id in (edge.source_id, edge.target_id):
                    node_entry = self._memory_nodes.get(endpoint_id)
                    if node_entry and node_entry[0] == organization_id:
                        nodes_by_id[endpoint_id] = node_entry[1]

        return GraphSubgraph(
            root_id=project_id,
            nodes=list(nodes_by_id.values()),
            edges=list(edges_by_id.values()),
        )

    async def get_subgraph(
        self,
        *,
        root_id: str,
        organization_id: str,
        depth: int = 2,
        relationship_type: RelationshipType | None = None,
    ) -> GraphSubgraph | None:
        clamped_depth = max(1, min(int(depth), self.max_traversal_depth))

        if await self.verify_connectivity():
            root_node = await self.get_node(root_id, organization_id)
            if root_node is None:
                return None
            driver = self._get_driver()
            nodes_by_id: dict[str, GraphNode] = {root_node.id: root_node}
            edges_by_id: dict[str, GraphEdge] = {}
            rel_filter = relationship_type.value if relationship_type else None

            async with driver.session(database=self.neo4j_database) as session:
                query = f"""
                MATCH path = (root:CortexNode {{id: $root_id, organization_id: $org_id}})
                             -[rels:RELATES_TO*1..{clamped_depth}]-
                             (neighbor:CortexNode {{organization_id: $org_id}})
                WHERE $rel_type IS NULL
                   OR ALL(r IN rels WHERE r.relationship_type = $rel_type)
                RETURN nodes(path) AS p_nodes, relationships(path) AS p_rels
                LIMIT 250
                """
                result = await session.run(
                    query,
                    root_id=root_id,
                    org_id=organization_id,
                    rel_type=rel_filter,
                )
                async for rec in result:
                    for n in rec["p_nodes"]:
                        node = self._record_to_node(dict(n))
                        nodes_by_id[node.id] = node
                    for r in rec["p_rels"]:
                        edge = self._record_to_edge(
                            dict(r),
                            str(r.start_node["id"]),
                            str(r.end_node["id"]),
                        )
                        edges_by_id[edge.id] = edge

            return GraphSubgraph(
                root_id=root_id,
                nodes=list(nodes_by_id.values()),
                edges=list(edges_by_id.values()),
            )

        # Cycle-safe BFS over in-memory adjacency list
        root_entry = self._memory_nodes.get(root_id)
        if not root_entry or root_entry[0] != organization_id:
            return None

        visited_nodes: dict[str, GraphNode] = {root_id: root_entry[1]}
        visited_edges: dict[str, GraphEdge] = {}
        seen_depths: dict[str, int] = {root_id: 0}
        queue: deque[tuple[str, int]] = deque([(root_id, 0)])

        org_edges = [
            edge
            for org_id, edge in self._memory_edges.values()
            if org_id == organization_id
            and (relationship_type is None or edge.relationship_type == relationship_type)
        ]

        while queue:
            current_id, hop = queue.popleft()
            if hop >= clamped_depth:
                continue

            for edge in org_edges:
                if edge.source_id != current_id and edge.target_id != current_id:
                    continue
                visited_edges[edge.id] = edge
                neighbor_id = edge.target_id if edge.source_id == current_id else edge.source_id
                neighbor_entry = self._memory_nodes.get(neighbor_id)
                if not neighbor_entry or neighbor_entry[0] != organization_id:
                    continue
                visited_nodes[neighbor_id] = neighbor_entry[1]
                next_hop = hop + 1
                if neighbor_id not in seen_depths or next_hop < seen_depths[neighbor_id]:
                    seen_depths[neighbor_id] = next_hop
                    queue.append((neighbor_id, next_hop))

        return GraphSubgraph(
            root_id=root_id,
            nodes=list(visited_nodes.values()),
            edges=list(visited_edges.values()),
        )

    async def find_shortest_path(
        self,
        *,
        source_id: str,
        target_id: str,
        organization_id: str,
        max_depth: int = 4,
    ) -> GraphPathResponse:
        clamped_depth = max(1, min(int(max_depth), 6))

        if source_id == target_id:
            node = await self.get_node(source_id, organization_id)
            return GraphPathResponse(
                source_id=source_id,
                target_id=target_id,
                found=node is not None,
                hop_count=0,
                nodes=[node] if node else [],
                edges=[],
            )

        if await self.verify_connectivity():
            driver = self._get_driver()
            async with driver.session(database=self.neo4j_database) as session:
                query = f"""
                MATCH (s:CortexNode {{id: $source_id, organization_id: $org_id}}),
                      (t:CortexNode {{id: $target_id, organization_id: $org_id}}),
                      p = shortestPath((s)-[:RELATES_TO*1..{clamped_depth}]-(t))
                RETURN nodes(p) AS p_nodes, relationships(p) AS p_rels
                LIMIT 1
                """
                result = await session.run(
                    query,
                    source_id=source_id,
                    target_id=target_id,
                    org_id=organization_id,
                )
                rec = await result.single()
                if not rec:
                    return GraphPathResponse(
                        source_id=source_id,
                        target_id=target_id,
                        found=False,
                    )
                nodes = [self._record_to_node(dict(n)) for n in rec["p_nodes"]]
                edges = [
                    self._record_to_edge(
                        dict(r), str(r.start_node["id"]), str(r.end_node["id"])
                    )
                    for r in rec["p_rels"]
                ]
                return GraphPathResponse(
                    source_id=source_id,
                    target_id=target_id,
                    found=True,
                    hop_count=len(edges),
                    nodes=nodes,
                    edges=edges,
                )

        # In-memory shortest path BFS
        src_entry = self._memory_nodes.get(source_id)
        dst_entry = self._memory_nodes.get(target_id)
        if (
            not src_entry
            or src_entry[0] != organization_id
            or not dst_entry
            or dst_entry[0] != organization_id
        ):
            return GraphPathResponse(
                source_id=source_id,
                target_id=target_id,
                found=False,
            )

        visited = {source_id}
        parent_map: dict[str, tuple[str, GraphEdge]] = {}
        queue: deque[tuple[str, int]] = deque([(source_id, 0)])

        org_edges = [
            edge
            for org_id, edge in self._memory_edges.values()
            if org_id == organization_id
        ]

        found = False
        while queue and not found:
            current_id, hop = queue.popleft()
            if hop >= clamped_depth:
                continue
            for edge in org_edges:
                if edge.source_id != current_id and edge.target_id != current_id:
                    continue
                nxt = edge.target_id if edge.source_id == current_id else edge.source_id
                if nxt in visited:
                    continue
                visited.add(nxt)
                parent_map[nxt] = (current_id, edge)
                if nxt == target_id:
                    found = True
                    break
                queue.append((nxt, hop + 1))

        if not found:
            return GraphPathResponse(
                source_id=source_id,
                target_id=target_id,
                found=False,
            )

        path_edges: list[GraphEdge] = []
        path_node_ids: list[str] = [target_id]
        cursor = target_id
        while cursor != source_id:
            prev_id, edge = parent_map[cursor]
            path_edges.append(edge)
            path_node_ids.append(prev_id)
            cursor = prev_id

        path_node_ids.reverse()
        path_edges.reverse()
        path_nodes = [self._memory_nodes[nid][1] for nid in path_node_ids if nid in self._memory_nodes]
        return GraphPathResponse(
            source_id=source_id,
            target_id=target_id,
            found=True,
            hop_count=len(path_edges),
            nodes=path_nodes,
            edges=path_edges,
        )
