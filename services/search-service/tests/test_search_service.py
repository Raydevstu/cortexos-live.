from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from cortexos_types.enums import SearchSourceType, SecurityRole

from app.core.security import RequestContext
from app.hybrid_ranker import HybridSearchService, fuse_hybrid_hits
from app.keyword import KeywordSearchEngine
from app.main import app
from app.qdrant_client import QdrantSemanticStore
from app.schemas import IndexChunksRequest, SearchHit


def test_fuse_hybrid_hits_rrf_and_graph_boost() -> None:
    kw_hits = [
        SearchHit(
            id="k1",
            source_type="artifact",
            source_id="art-1",
            excerpt="Temporal durable workflows",
            keyword_score=2.5,
        ),
        SearchHit(
            id="k2",
            source_type="concept",
            source_id="con-1",
            excerpt="Event outbox",
            keyword_score=1.4,
        ),
    ]
    vec_hits = [
        SearchHit(
            id="v1",
            source_type="concept",
            source_id="con-1",
            excerpt="Event outbox",
            vector_score=0.92,
        ),
        SearchHit(
            id="v2",
            source_type="artifact",
            source_id="art-2",
            excerpt="Qdrant semantic collection",
            vector_score=0.81,
        ),
    ]

    ranked = fuse_hybrid_hits(
        keyword_hits=kw_hits,
        vector_hits=vec_hits,
        graph_boost_ids={"art-1"},
        limit=10,
    )
    assert len(ranked) == 3
    ids_in_order = [h.source_id for h in ranked]
    assert ids_in_order[0] == "art-1"
    assert ranked[0].graph_score == 1.0
    assert ranked[1].source_id == "con-1"


@pytest.mark.asyncio
async def test_keyword_and_vector_indexing_and_removal() -> None:
    keyword_engine = KeywordSearchEngine(brain_service_url="http://127.0.0.1:9")
    vector_store = QdrantSemanticStore(
        qdrant_url="http://127.0.0.1:9",
        collection_name="test_collection",
        use_in_memory_fallback=True,
    )
    svc = HybridSearchService(
        keyword_engine=keyword_engine,
        vector_store=vector_store,
        graph_service_url="http://127.0.0.1:9",
    )
    ctx = RequestContext(
        subject_id="user-1",
        organization_id="org-1",
        role=SecurityRole.BUILDER,
    )

    indexed = await svc.index_chunks(
        IndexChunksRequest(
            source_type=SearchSourceType.ARTIFACT,
            source_id="art-42",
            project_id="proj-9",
            title="CortexOS Hybrid Search Spec",
            chunks=[
                "CortexOS fuses PostgreSQL BM25 keyword search with Qdrant semantic vectors.",
                "Neo4j knowledge graph proximity boosts connected architectural concepts.",
            ],
        ),
        ctx,
    )
    assert indexed.indexed_count == 2
    assert len(indexed.embedding_ids) == 2

    kw_hits = keyword_engine.search_local(
        query="Qdrant semantic vectors",
        organization_id="org-1",
        project_id="proj-9",
    )
    assert len(kw_hits) >= 1
    assert kw_hits[0].source_id == "art-42"

    vec_hits = await vector_store.search_similar(
        query="Qdrant semantic vectors",
        organization_id="org-1",
        project_id="proj-9",
    )
    assert len(vec_hits) >= 1
    assert vec_hits[0].source_id == "art-42"

    removed = await svc.delete_source_index("art-42")
    assert removed == 2


def test_search_routes_and_rbac_enforcement() -> None:
    client = TestClient(app)

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["service"] == "search-service"

    observer_headers = {
        "x-cortex-user-id": "observer-1",
        "x-cortex-org-id": "org-1",
        "x-cortex-role": "Observer",
    }
    forbidden = client.post(
        "/api/v1/search/index",
        json={
            "sourceType": "artifact",
            "sourceId": "art-denied",
            "chunks": ["Unauthorized chunk"],
        },
        headers=observer_headers,
    )
    assert forbidden.status_code == 403

    builder_headers = {
        "x-cortex-user-id": "builder-1",
        "x-cortex-org-id": "org-1",
        "x-cortex-role": "Builder",
    }
    created = client.post(
        "/api/v1/search/index",
        json={
            "sourceType": "artifact",
            "sourceId": "art-100",
            "projectId": "proj-1",
            "title": "Librarian Pipeline",
            "chunks": ["Librarian classifies entities and indexes semantic chunks into Qdrant."],
        },
        headers=builder_headers,
    )
    assert created.status_code == 201
    assert created.json()["indexedCount"] == 1

    res = client.get(
        "/api/v1/search",
        params={"query": "Qdrant semantic chunks", "project_id": "proj-1"},
        headers=observer_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert any(h["sourceId"] == "art-100" for h in body["hits"])

    deleted = client.delete("/api/v1/search/index/art-100", headers=builder_headers)
    assert deleted.status_code == 200
    assert deleted.json()["deletedCount"] == 1
