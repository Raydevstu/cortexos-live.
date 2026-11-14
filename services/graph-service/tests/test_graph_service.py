from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from cortexos_types.enums import GraphNodeType, RelationshipType, SecurityRole

from app.core.security import RequestContext
from app.main import app
from app.neo4j_client import Neo4jGraphStore
from app.schemas import GraphSyncEdgeInput, GraphSyncNodeInput, GraphSyncRequest
from app.sync import GraphSyncService


@pytest.mark.asyncio
async def test_cycle_safe_subgraph_and_shortest_path() -> None:
    store = Neo4jGraphStore(
        neo4j_uri="bolt://127.0.0.1:1",
        neo4j_user="neo4j",
        neo4j_password="dev",
        use_in_memory_fallback=True,
    )
    sync_service = GraphSyncService(store)
    ctx = RequestContext(
        subject_id="builder-1",
        organization_id="org-1",
        role=SecurityRole.BUILDER,
    )

    result = await sync_service.sync_graph(
        GraphSyncRequest(
            project_id="proj-1",
            nodes=[
                GraphSyncNodeInput(
                    id="node-a",
                    label="Auth Gateway",
                    node_type=GraphNodeType.ARTIFACT,
                    project_id="proj-1",
                ),
                GraphSyncNodeInput(
                    id="node-b",
                    label="RBAC Policy",
                    node_type=GraphNodeType.CONCEPT,
                    project_id="proj-1",
                ),
                GraphSyncNodeInput(
                    id="node-c",
                    label="PostgreSQL",
                    node_type=GraphNodeType.ENTITY,
                    project_id="proj-1",
                ),
            ],
            edges=[
                GraphSyncEdgeInput(
                    source_id="node-a",
                    target_id="node-b",
                    relationship_type=RelationshipType.IMPLEMENTS,
                ),
                GraphSyncEdgeInput(
                    source_id="node-b",
                    target_id="node-c",
                    relationship_type=RelationshipType.DEPENDS_ON,
                ),
                GraphSyncEdgeInput(
                    source_id="node-c",
                    target_id="node-a",
                    relationship_type=RelationshipType.INFLUENCES,
                ),
            ],
        ),
        ctx,
    )
    assert result.nodes_upserted == 3
    assert result.edges_upserted == 3

    subgraph = await store.get_subgraph(
        root_id="node-a",
        organization_id="org-1",
        depth=4,
    )
    assert subgraph is not None
    assert {n.id for n in subgraph.nodes} == {"node-a", "node-b", "node-c"}
    assert len(subgraph.edges) == 3

    path = await store.find_shortest_path(
        source_id="node-a",
        target_id="node-c",
        organization_id="org-1",
        max_depth=4,
    )
    assert path.found is True
    assert path.hop_count == 1


def test_graph_routes_self_loop_validation_and_rbac() -> None:
    client = TestClient(app)

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["service"] == "graph-service"

    observer_headers = {
        "x-cortex-user-id": "observer-1",
        "x-cortex-org-id": "org-1",
        "x-cortex-role": "Observer",
    }
    builder_headers = {
        "x-cortex-user-id": "builder-1",
        "x-cortex-org-id": "org-1",
        "x-cortex-role": "Builder",
    }

    denied = client.post(
        "/api/v1/graph/sync",
        json={"nodes": [], "edges": []},
        headers=observer_headers,
    )
    assert denied.status_code == 403

    self_loop = client.post(
        "/api/v1/graph/sync",
        json={
            "nodes": [{"id": "n1", "label": "Self", "nodeType": "Concept"}],
            "edges": [
                {
                    "sourceId": "n1",
                    "targetId": "n1",
                    "relationshipType": "REFERENCES",
                }
            ],
        },
        headers=builder_headers,
    )
    assert self_loop.status_code == 422

    synced = client.post(
        "/api/v1/graph/sync",
        json={
            "projectId": "proj-alpha",
            "nodes": [
                {"id": "art-1", "label": "API Spec", "nodeType": "Artifact"},
                {"id": "ent-1", "label": "Neo4j", "nodeType": "Entity"},
            ],
            "edges": [
                {
                    "id": "rel-1",
                    "sourceId": "art-1",
                    "targetId": "ent-1",
                    "relationshipType": "USES",
                }
            ],
        },
        headers=builder_headers,
    )
    assert synced.status_code == 200
    assert synced.json()["nodesUpserted"] == 2
    assert synced.json()["edgesUpserted"] == 1

    node_detail = client.get("/api/v1/graph/nodes/art-1", headers=observer_headers)
    assert node_detail.status_code == 200
    assert node_detail.json()["node"]["label"] == "API Spec"
    assert len(node_detail.json()["neighbors"]) == 1

    project_graph = client.get("/api/v1/graph/projects/proj-alpha", headers=observer_headers)
    assert project_graph.status_code == 200
    assert len(project_graph.json()["nodes"]) == 2

    subgraph = client.get(
        "/api/v1/graph/subgraph/art-1",
        params={"depth": 2},
        headers=observer_headers,
    )
    assert subgraph.status_code == 200
    assert len(subgraph.json()["edges"]) == 1

    path = client.get(
        "/api/v1/graph/path",
        params={"source_id": "art-1", "target_id": "ent-1"},
        headers=observer_headers,
    )
    assert path.status_code == 200
    assert path.json()["found"] is True
    assert path.json()["hopCount"] == 1
