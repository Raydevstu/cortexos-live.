from __future__ import annotations

from cortexos_types.enums import KnowledgeArticleType, SourceType

from app.schemas.librarian import ClassificationResult, NormalizeResult

_DOMAIN_KEYWORDS: dict[str, tuple[str, ...]] = {
    "architecture": ("architecture", "openapi", "schema", "microservice", "cqrs", "postgres", "neo4j", "qdrant"),
    "design": ("wireframe", "design system", "figma", "accessibility", "ui", "ux", "token"),
    "product": ("prd", "roadmap", "persona", "user story", "market", "competitor", "requirement"),
    "engineering": ("fastapi", "typescript", "nextjs", "react", "sqlalchemy", "docker", "kubernetes"),
    "security": ("rbac", "oauth", "policy", "audit", "auth", "encryption", "vulnerability"),
    "ai-intelligence": ("agent", "rag", "embedding", "llm", "provider", "mainbrain", "librarian", "jarvis"),
}


def classify_content(
    normalized: NormalizeResult,
    *,
    source_type: SourceType = SourceType.DOCUMENT,
) -> ClassificationResult:
    """Classify normalized content into domain, article type, and tags."""
    haystack = f"{normalized.title}\n{normalized.normalized_text}".lower()
    scores: dict[str, int] = {}
    matched_tags: list[str] = []

    for domain, keywords in _DOMAIN_KEYWORDS.items():
        hits = 0
        for kw in keywords:
            if kw in haystack:
                hits += 1
                if kw not in matched_tags:
                    matched_tags.append(kw.replace(" ", "-"))
        if hits:
            scores[domain] = hits

    if scores:
        primary_domain = max(scores, key=lambda key: scores[key])
        confidence = min(0.98, 0.65 + 0.08 * scores[primary_domain])
    else:
        primary_domain = "general"
        confidence = 0.6

    suggested_type = KnowledgeArticleType.SUMMARY
    if "decision" in haystack or "reasoning" in haystack:
        suggested_type = KnowledgeArticleType.DECISION
    elif "pattern" in haystack:
        suggested_type = KnowledgeArticleType.PATTERN
    elif "doctrine" in haystack:
        suggested_type = KnowledgeArticleType.DOCTRINE
    elif "playbook" in haystack or "runbook" in haystack:
        suggested_type = KnowledgeArticleType.PLAYBOOK

    return ClassificationResult(
        primary_domain=primary_domain,
        source_type=source_type,
        suggested_article_type=suggested_type,
        tags=matched_tags[:10],
        confidence=round(confidence, 2),
    )
