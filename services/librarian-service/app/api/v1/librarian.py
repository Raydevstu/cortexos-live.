from __future__ import annotations

from fastapi import APIRouter, Depends, Query

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
from cortexos_types.enums import KnowledgeArticleType

from app.core.security import RequestContext, require_permission
from app.schemas.librarian import CompoundRequest, CompoundResult
from app.services.librarian_svc import LibrarianService

router = APIRouter(prefix="/librarian", tags=["librarian"])


def get_librarian_service() -> LibrarianService:
    return LibrarianService()


@router.post("/ingest", response_model=LibrarianIngestResult)
async def ingest_artifact_or_source(
    payload: LibrarianIngestRequest,
    svc: LibrarianService = Depends(get_librarian_service),
    ctx: RequestContext = Depends(require_permission("knowledge", "write")),
) -> LibrarianIngestResult:
    return await svc.ingest(payload, ctx)


@router.post("/extract/entities", response_model=list[Entity])
async def extract_entities_route(
    payload: LibrarianExtractRequest,
    svc: LibrarianService = Depends(get_librarian_service),
    ctx: RequestContext = Depends(require_permission("knowledge", "write")),
) -> list[Entity]:
    return await svc.extract_entities_only(payload, ctx)


@router.post("/extract/concepts", response_model=list[Concept])
async def extract_concepts_route(
    payload: LibrarianExtractRequest,
    svc: LibrarianService = Depends(get_librarian_service),
    ctx: RequestContext = Depends(require_permission("knowledge", "write")),
) -> list[Concept]:
    return await svc.extract_concepts_only(payload, ctx)


@router.post("/extract/patterns", response_model=list[Pattern])
async def extract_patterns_route(
    payload: LibrarianExtractRequest,
    svc: LibrarianService = Depends(get_librarian_service),
    ctx: RequestContext = Depends(require_permission("knowledge", "write")),
) -> list[Pattern]:
    return await svc.extract_patterns_only(payload, ctx)


@router.post("/relationships", response_model=Relationship)
async def build_relationship_route(
    payload: LibrarianRelationshipRequest,
    svc: LibrarianService = Depends(get_librarian_service),
    ctx: RequestContext = Depends(require_permission("knowledge", "write")),
) -> Relationship:
    return await svc.link_relationship(payload, ctx)


@router.post("/sync", response_model=MainBrainContext)
async def sync_mainbrain_route(
    payload: LibrarianSyncRequest,
    svc: LibrarianService = Depends(get_librarian_service),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
) -> MainBrainContext:
    return await svc.sync_mainbrain(payload, ctx)


@router.post("/compound", response_model=CompoundResult)
async def compound_intelligence_route(
    payload: CompoundRequest,
    svc: LibrarianService = Depends(get_librarian_service),
    ctx: RequestContext = Depends(require_permission("knowledge", "write")),
) -> CompoundResult:
    return await svc.compound(payload, ctx)


@router.post("/audit", response_model=LibrarianAuditReport)
async def run_audit_route(
    project_id: str | None = Query(default=None),
    svc: LibrarianService = Depends(get_librarian_service),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
) -> LibrarianAuditReport:
    return await svc.audit(project_id=project_id, ctx=ctx)


@router.get("/audit", response_model=LibrarianAuditReport)
async def get_audit_route(
    project_id: str | None = Query(default=None),
    svc: LibrarianService = Depends(get_librarian_service),
    ctx: RequestContext = Depends(require_permission("knowledge", "read")),
) -> LibrarianAuditReport:
    return await svc.audit(project_id=project_id, ctx=ctx)


@router.get("/wiki/{article_type}/{slug}")
async def get_wiki_page_route(
    article_type: KnowledgeArticleType,
    slug: str,
    svc: LibrarianService = Depends(get_librarian_service),
    _: RequestContext = Depends(require_permission("knowledge", "read")),
) -> dict[str, str]:
    content = svc.read_wiki_page(article_type, slug)
    return {"articleType": article_type.value, "slug": slug, "markdown": content}
