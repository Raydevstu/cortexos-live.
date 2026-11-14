from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from cortexos_types import (
    Artifact,
    Concept,
    Decision,
    Doctrine,
    Entity,
    MainBrainContext,
    Pattern,
    Relationship,
)
from cortexos_types.enums import (
    ArtifactStatus,
    ArtifactType,
    RelationshipType,
)

from app.api.v1.librarian import get_librarian_service
from app.core.config import Settings
from app.core.security import RequestContext
from app.main import create_app
from app.pipelines import (
    build_relationships,
    classify_content,
    extract_knowledge,
    generate_wiki_pages,
    normalize_content,
    run_compounding,
    run_knowledge_audit,
)
from app.services.librarian_svc import LibrarianService


class InMemoryEcosystemClient:
    def __init__(self) -> None:
        self.entities: dict[str, Entity] = {}
        self.concepts: dict[str, Concept] = {}
        self.patterns: dict[str, Pattern] = {}
        self.doctrines: dict[str, Doctrine] = {}
        self.relationships: dict[str, Relationship] = {}
        self.indexed_chunks: list[str] = []
        self.artifacts: list[Artifact] = []
        self.decisions: list[Decision] = []

    async def persist_entity(self, entity: Entity, ctx: RequestContext) -> Entity:
        self.entities[entity.id] = entity
        return entity

    async def persist_concept(self, concept: Concept, ctx: RequestContext) -> Concept:
        self.concepts[concept.id] = concept
        return concept

    async def persist_pattern(self, pattern: Pattern, ctx: RequestContext) -> Pattern:
        self.patterns[pattern.id] = pattern
        return pattern

    async def persist_doctrine(self, doctrine: Doctrine, ctx: RequestContext) -> Doctrine:
        self.doctrines[doctrine.id] = doctrine
        return doctrine

    async def persist_relationship(
        self, relationship: Relationship, ctx: RequestContext
    ) -> Relationship:
        self.relationships[relationship.id] = relationship
        return relationship

    async def sync_graph(self, **kwargs) -> None:
        return None

    async def index_search_chunks(self, *, chunks: list[str], **kwargs) -> int:
        self.indexed_chunks.extend(chunks)
        return len(chunks)

    async def fetch_mainbrain_snapshot(
        self, *, project_id: str | None, ctx: RequestContext
    ) -> MainBrainContext:
        return MainBrainContext(
            project=None,
            artifacts=self.artifacts,
            decisions=self.decisions,
            concepts=list(self.concepts.values()),
            entities=list(self.entities.values()),
            patterns=list(self.patterns.values()),
            articles=[],
            relationships=list(self.relationships.values()),
        )


def test_pipeline_normalize_classify_extract_link_wiki(tmp_path: Path) -> None:
    raw = (
        "# CortexOS Architecture\n\n"
        "We use FastAPI, PostgreSQL, Neo4j, and Qdrant with the Repository Pattern "
        "and Event Driven Pattern to implement Hybrid Search and RAG."
    )
    norm = normalize_content("CortexOS Architecture", raw)
    assert len(norm.checksum) == 64
    assert norm.headings == ["CortexOS Architecture"]

    cls = classify_content(norm)
    assert cls.primary_domain == "architecture"

    bundle = extract_knowledge(norm.normalized_text)
    entity_names = {e.name for e in bundle.entities}
    assert {"FastAPI", "PostgreSQL", "Neo4j", "Qdrant"}.issubset(entity_names)

    edges = build_relationships(
        origin_id="art-001",
        bundle=bundle,
        project_id="proj-001",
    )
    assert any(e.relationship_type == RelationshipType.CONTAINS for e in edges)
    assert all(e.source_id != e.target_id for e in edges)

    wiki = generate_wiki_pages(
        title="CortexOS Architecture",
        summary="Architecture summary",
        bundle=bundle,
        relationships=edges,
        vault_dir=tmp_path,
        write_files=True,
    )
    assert len(wiki) >= 4
    assert (tmp_path / "wiki/entities/fastapi.md").exists()


def test_compounding_promotes_pattern_to_doctrine_after_five_reuses() -> None:
    now = datetime.now(timezone.utc)
    pattern = Pattern(
        id="pat-repo",
        name="Repository Pattern",
        category="data-access",
        description="Canonical repository boundary",
        reusability_score=9,
        created_at=now,
        updated_at=now,
    )
    rels = [
        Relationship(
            id=f"rel-{i}",
            source_id=f"art-{i}",
            target_id=pattern.id,
            relationship_type=RelationshipType.IMPLEMENTS,
            created_at=now,
            updated_at=now,
        )
        for i in range(5)
    ]
    res = run_compounding(
        patterns=[pattern],
        existing_doctrines=[],
        relationships=rels,
        min_reuse_for_doctrine=5,
    )
    assert len(res.promoted_doctrines) == 1
    assert res.promoted_doctrines[0].source_pattern_id == pattern.id


def test_audit_detects_orphan_and_stale_artifacts() -> None:
    old = datetime.now(timezone.utc) - timedelta(days=120)
    artifact = Artifact(
        id="art-orphan",
        organization_id="org-1",
        project_id="proj-1",
        title="Unlinked Spec",
        artifact_type=ArtifactType.PRD,
        status=ArtifactStatus.DRAFT,
        version="1.0.0",
        created_at=old,
        updated_at=old,
    )
    report = run_knowledge_audit(
        artifacts=[artifact],
        entities=[],
        concepts=[],
        decisions=[],
        patterns=[],
        relationships=[],
        project_id="proj-1",
        stale_days=90,
    )
    issue_types = {issue.issue_type for issue in report.issues}
    assert not report.healthy
    assert {"orphan_artifact", "missing_metadata", "stale_knowledge", "knowledge_gap"}.issubset(
        issue_types
    )


@pytest.mark.asyncio
async def test_librarian_api_ingest_compound_audit_and_rbac(tmp_path: Path) -> None:
    eco = InMemoryEcosystemClient()
    settings = Settings(brain_vault_dir=tmp_path, write_wiki_files=True)
    svc = LibrarianService(settings=settings, client=eco)

    app = create_app()
    app.dependency_overrides[get_librarian_service] = lambda: svc

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        ingest_res = await client.post(
            "/api/v1/librarian/ingest",
            json={
                "projectId": "proj-solar",
                "title": "Solar CRM Stack",
                "content": "Built on FastAPI, PostgreSQL, Neo4j, and Temporal with Repository Pattern and RAG.",
            },
        )
        assert ingest_res.status_code == 200
        body = ingest_res.json()
        assert len(body["entityIds"]) >= 3
        assert body["indexedCount"] >= 1

        sync_res = await client.post("/api/v1/librarian/sync", json={"projectId": "proj-solar"})
        assert sync_res.status_code == 200
        assert len(sync_res.json()["entities"]) >= 3

        forbidden = await client.post(
            "/api/v1/librarian/ingest",
            headers={"x-cortex-role": "Observer"},
            json={"title": "Blocked", "content": "No permission"},
        )
        assert forbidden.status_code == 403
