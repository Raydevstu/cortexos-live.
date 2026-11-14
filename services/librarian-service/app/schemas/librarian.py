from __future__ import annotations

from pydantic import Field

from cortexos_types import (
    Concept,
    CortexModel,
    Doctrine,
    Entity,
    KnowledgeArticle,
    Pattern,
    Relationship,
)
from cortexos_types.enums import KnowledgeArticleType, SourceType


class NormalizeResult(CortexModel):
    title: str
    normalized_text: str
    checksum: str
    headings: list[str] = Field(default_factory=list)
    chunks: list[str] = Field(default_factory=list)
    word_count: int = 0


class ClassificationResult(CortexModel):
    primary_domain: str
    source_type: SourceType = SourceType.DOCUMENT
    suggested_article_type: KnowledgeArticleType = KnowledgeArticleType.SUMMARY
    tags: list[str] = Field(default_factory=list)
    confidence: float = 0.85


class ExtractionBundle(CortexModel):
    entities: list[Entity] = Field(default_factory=list)
    concepts: list[Concept] = Field(default_factory=list)
    patterns: list[Pattern] = Field(default_factory=list)


class WikiArticleOutput(CortexModel):
    article: KnowledgeArticle
    relative_path: str
    markdown: str


class CompoundRequest(CortexModel):
    organization_id: str | None = None
    project_id: str | None = None
    min_reuse_for_doctrine: int = 5


class CompoundResult(CortexModel):
    promoted_doctrines: list[Doctrine] = Field(default_factory=list)
    discovered_relationships: list[Relationship] = Field(default_factory=list)
    consolidated_articles: list[KnowledgeArticle] = Field(default_factory=list)
    pattern_reuse_counts: dict[str, int] = Field(default_factory=dict)
