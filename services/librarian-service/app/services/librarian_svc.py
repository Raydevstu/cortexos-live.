from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status

from cortexos_types import (
    Concept,
    Entity,
    LibrarianAuditReport,
    LibrarianExtractRequest,
    LibrarianIngestRequest,
    LibrarianIngestResult,
    LibrarianRelationshipRequest,
    LibrarianSyncRequest,
    MainBrainContext,
    Pattern,
    Relationship,
)
from cortexos_types.enums import KnowledgeArticleType, SourceType
from cortexos_types.security import PolicyEvaluationContext

from app.clients.ecosystem import EcosystemClient, HttpEcosystemClient
from app.core.config import Settings, get_settings
from app.core.security import PolicyEvaluator, RequestContext
from app.pipelines import (
    build_relationships,
    classify_content,
    extract_concepts,
    extract_entities,
    extract_knowledge,
    extract_patterns,
    generate_wiki_pages,
    normalize_content,
    run_compounding,
    run_knowledge_audit,
)
from app.pipelines.wiki import slugify
from app.schemas.librarian import CompoundRequest, CompoundResult


class LibrarianService:
    """Orchestrates the full CortexOS knowledge pipeline without executing project work."""

    def __init__(
        self,
        *,
        settings: Settings | None = None,
        client: EcosystemClient | None = None,
        evaluator: PolicyEvaluator | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.client = client or HttpEcosystemClient(
            brain_url=self.settings.brain_service_url,
            graph_url=self.settings.graph_service_url,
            search_url=self.settings.search_service_url,
        )
        self.evaluator = evaluator or PolicyEvaluator()

    def _authorize(self, ctx: RequestContext, action: str) -> None:
        decision = self.evaluator.evaluate(
            PolicyEvaluationContext(
                subject_id=ctx.subject_id,
                organization_id=ctx.organization_id,
                role=ctx.role,
                resource="knowledge",
                action=action,
            )
        )
        if not decision.allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=decision.reason or "Permission denied",
            )

    async def ingest(
        self,
        payload: LibrarianIngestRequest,
        ctx: RequestContext,
    ) -> LibrarianIngestResult:
        self._authorize(ctx, "write")
        org_id = payload.organization_id or ctx.organization_id

        normalized = normalize_content(payload.title, payload.content)
        classification = classify_content(
            normalized,
            source_type=payload.source_type or SourceType.DOCUMENT,
        )
        bundle = extract_knowledge(
            normalized.normalized_text,
            organization_id=org_id,
        )

        persisted_entities = [
            await self.client.persist_entity(e, ctx) for e in bundle.entities
        ]
        persisted_concepts = [
            await self.client.persist_concept(c, ctx) for c in bundle.concepts
        ]
        persisted_patterns = [
            await self.client.persist_pattern(p, ctx) for p in bundle.patterns
        ]

        origin_id = payload.artifact_id or str(
            uuid.uuid5(uuid.NAMESPACE_URL, f"cortexos:source:{normalized.checksum}")
        )
        persisted_bundle = bundle.model_copy(
            update={
                "entities": persisted_entities,
                "concepts": persisted_concepts,
                "patterns": persisted_patterns,
            }
        )
        edges = build_relationships(
            origin_id=origin_id,
            bundle=persisted_bundle,
            organization_id=org_id,
            project_id=payload.project_id,
        )
        persisted_edges = [
            await self.client.persist_relationship(edge, ctx) for edge in edges
        ]

        summary_excerpt = normalized.normalized_text[:280]
        wiki_outputs = generate_wiki_pages(
            title=normalized.title,
            summary=f"[{classification.primary_domain}] {summary_excerpt}",
            bundle=persisted_bundle,
            relationships=persisted_edges,
            organization_id=org_id,
            vault_dir=self.settings.brain_vault_dir,
            write_files=self.settings.write_wiki_files,
        )

        await self.client.sync_graph(
            entities=persisted_entities,
            concepts=persisted_concepts,
            patterns=persisted_patterns,
            relationships=persisted_edges,
            ctx=ctx,
        )
        indexed_count = await self.client.index_search_chunks(
            source_type="artifact" if payload.artifact_id else "source",
            source_id=origin_id,
            project_id=payload.project_id,
            chunks=normalized.chunks,
            ctx=ctx,
        )

        return LibrarianIngestResult(
            source_id=None if payload.artifact_id else origin_id,
            artifact_id=payload.artifact_id,
            entity_ids=[e.id for e in persisted_entities],
            concept_ids=[c.id for c in persisted_concepts],
            pattern_ids=[p.id for p in persisted_patterns],
            relationship_ids=[r.id for r in persisted_edges],
            wiki_article_ids=[w.article.id for w in wiki_outputs],
            indexed_count=indexed_count,
        )

    async def extract_entities_only(
        self, payload: LibrarianExtractRequest, ctx: RequestContext
    ) -> list[Entity]:
        self._authorize(ctx, "write")
        entities = extract_entities(payload.text, organization_id=ctx.organization_id)
        return [await self.client.persist_entity(e, ctx) for e in entities]

    async def extract_concepts_only(
        self, payload: LibrarianExtractRequest, ctx: RequestContext
    ) -> list[Concept]:
        self._authorize(ctx, "write")
        concepts = extract_concepts(payload.text, organization_id=ctx.organization_id)
        return [await self.client.persist_concept(c, ctx) for c in concepts]

    async def extract_patterns_only(
        self, payload: LibrarianExtractRequest, ctx: RequestContext
    ) -> list[Pattern]:
        self._authorize(ctx, "write")
        patterns = extract_patterns(payload.text, organization_id=ctx.organization_id)
        return [await self.client.persist_pattern(p, ctx) for p in patterns]

    async def link_relationship(
        self, payload: LibrarianRelationshipRequest, ctx: RequestContext
    ) -> Relationship:
        self._authorize(ctx, "write")
        if payload.source_id == payload.target_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Self-loop relationships are not permitted",
            )
        now = datetime.now(timezone.utc)
        edge = Relationship(
            id=str(
                uuid.uuid5(
                    uuid.NAMESPACE_URL,
                    f"cortexos:edge:{payload.source_id}:{payload.relationship_type}:{payload.target_id}",
                )
            ),
            organization_id=ctx.organization_id,
            source_id=payload.source_id,
            target_id=payload.target_id,
            relationship_type=payload.relationship_type,
            weight=1.0,
            confidence=payload.confidence or 1.0,
            created_at=now,
            updated_at=now,
        )
        persisted = await self.client.persist_relationship(edge, ctx)
        await self.client.sync_graph(
            entities=[],
            concepts=[],
            patterns=[],
            relationships=[persisted],
            ctx=ctx,
        )
        return persisted

    async def sync_mainbrain(
        self, payload: LibrarianSyncRequest, ctx: RequestContext
    ) -> MainBrainContext:
        self._authorize(ctx, "read")
        snapshot = await self.client.fetch_mainbrain_snapshot(
            project_id=payload.project_id,
            ctx=ctx,
        )
        if payload.full_reindex:
            for artifact in snapshot.artifacts:
                await self.client.index_search_chunks(
                    source_type="artifact",
                    source_id=artifact.id,
                    project_id=artifact.project_id,
                    chunks=[f"{artifact.title}\n{artifact.summary or ''}".strip()],
                    ctx=ctx,
                )
        return snapshot

    async def compound(
        self, payload: CompoundRequest, ctx: RequestContext
    ) -> CompoundResult:
        self._authorize(ctx, "write")
        snapshot = await self.client.fetch_mainbrain_snapshot(
            project_id=payload.project_id,
            ctx=ctx,
        )
        result = run_compounding(
            patterns=snapshot.patterns,
            existing_doctrines=[],
            relationships=snapshot.relationships,
            organization_id=payload.organization_id or ctx.organization_id,
            min_reuse_for_doctrine=payload.min_reuse_for_doctrine,
        )
        for doctrine in result.promoted_doctrines:
            await self.client.persist_doctrine(doctrine, ctx)
        for edge in result.discovered_relationships:
            await self.client.persist_relationship(edge, ctx)
        return result

    async def audit(
        self,
        *,
        project_id: str | None,
        ctx: RequestContext,
    ) -> LibrarianAuditReport:
        self._authorize(ctx, "read")
        snapshot = await self.client.fetch_mainbrain_snapshot(
            project_id=project_id,
            ctx=ctx,
        )
        return run_knowledge_audit(
            artifacts=snapshot.artifacts,
            entities=snapshot.entities,
            concepts=snapshot.concepts,
            decisions=snapshot.decisions,
            patterns=snapshot.patterns,
            relationships=snapshot.relationships,
            project_id=project_id,
            stale_days=self.settings.stale_days_threshold,
        )

    def read_wiki_page(self, article_type: KnowledgeArticleType, slug: str) -> str:
        folder_map = {
            KnowledgeArticleType.ENTITY: "entities",
            KnowledgeArticleType.CONCEPT: "concepts",
            KnowledgeArticleType.PATTERN: "patterns",
            KnowledgeArticleType.DOCTRINE: "doctrines",
            KnowledgeArticleType.PROJECT: "projects",
            KnowledgeArticleType.DECISION: "decisions",
            KnowledgeArticleType.SUMMARY: "summaries",
            KnowledgeArticleType.PLAYBOOK: "playbooks",
        }
        safe_slug = slugify(slug)
        target = self.settings.brain_vault_dir / "wiki" / folder_map[article_type] / f"{safe_slug}.md"
        if not target.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Wiki page '{article_type.value}/{safe_slug}' not found",
            )
        return target.read_text(encoding="utf-8")
