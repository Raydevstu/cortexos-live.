from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import Field

from .artifact import Artifact
from .base import BaseEntity, CortexModel
from .enums import (
    ArtifactType,
    DecisionStatus,
    EntityType,
    GraphNodeType,
    KnowledgeArticleType,
    RelationshipType,
    SearchSourceType,
    SourceType,
)
from .project import Project


class Entity(BaseEntity):
    organization_id: str | None = None
    name: str
    entity_type: EntityType
    description: str
    aliases: list[str] = Field(default_factory=list)


class Concept(BaseEntity):
    organization_id: str | None = None
    name: str
    description: str
    domain: str
    keywords: list[str] = Field(default_factory=list)


class Decision(BaseEntity):
    organization_id: str | None = None
    project_id: str
    title: str
    context: str
    decision: str
    reasoning: str
    impact: str
    status: DecisionStatus | str


class Pattern(BaseEntity):
    organization_id: str | None = None
    name: str
    category: str
    description: str
    reusability_score: int


class Doctrine(BaseEntity):
    organization_id: str | None = None
    name: str
    description: str
    source_pattern_id: str
    approved_by: str | None = None


class Source(BaseEntity):
    organization_id: str | None = None
    project_id: str | None = None
    source_type: SourceType
    title: str
    source_uri: str
    raw_content: str | None = None
    checksum: str


class KnowledgeArticle(BaseEntity):
    organization_id: str | None = None
    title: str
    article_type: KnowledgeArticleType | str
    content: str
    summary: str
    generated_by: str


class Relationship(BaseEntity):
    organization_id: str | None = None
    source_id: str
    target_id: str
    relationship_type: RelationshipType
    weight: float | None = None
    confidence: float | None = None


class SearchDocument(CortexModel):
    id: str
    source_type: SearchSourceType
    source_id: str
    project_id: str | None = None
    content: str
    embedding_id: str | None = None
    indexed_at: datetime


class GraphNode(CortexModel):
    id: str
    label: str
    node_type: GraphNodeType
    project_id: str | None = None
    properties: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(CortexModel):
    id: str
    source_id: str
    target_id: str
    relationship_type: RelationshipType
    properties: dict[str, Any] = Field(default_factory=dict)


class GraphSubgraph(CortexModel):
    root_id: str | None = None
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class KnowledgeQuery(CortexModel):
    query: str
    project_id: str | None = None
    entity_types: list[EntityType] | None = None
    artifact_types: list[ArtifactType] | None = None
    projects: list[str] | None = None
    limit: int | None = None


class KnowledgeResult(CortexModel):
    artifacts: list[Artifact]
    concepts: list[Concept]
    entities: list[Entity]
    decisions: list[Decision]
    patterns: list[Pattern] = Field(default_factory=list)
    relationships: list[Relationship]


class SearchRequestParams(CortexModel):
    query: str
    project_id: str | None = None
    entity_type: EntityType | None = None
    artifact_type: ArtifactType | None = None
    limit: int | None = None


class SearchResponse(CortexModel):
    artifacts: list[Artifact]
    concepts: list[Concept]
    entities: list[Entity]
    decisions: list[Decision]
    articles: list[KnowledgeArticle] = Field(default_factory=list)
    total: int


class MainBrainContext(CortexModel):
    project: Project | None = None
    artifacts: list[Artifact]
    decisions: list[Decision]
    concepts: list[Concept]
    entities: list[Entity]
    patterns: list[Pattern]
    articles: list[KnowledgeArticle]
    relationships: list[Relationship]


class CreateEntityRequest(CortexModel):
    organization_id: str | None = None
    name: str
    entity_type: EntityType
    description: str
    aliases: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class CreateConceptRequest(CortexModel):
    organization_id: str | None = None
    name: str
    description: str
    domain: str
    keywords: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class CreateDecisionRequest(CortexModel):
    organization_id: str | None = None
    project_id: str
    title: str
    context: str
    decision: str
    reasoning: str
    impact: str
    status: DecisionStatus = DecisionStatus.PROPOSED


class LibrarianIngestRequest(CortexModel):
    organization_id: str | None = None
    project_id: str | None = None
    artifact_id: str | None = None
    source_type: SourceType | None = None
    title: str
    content: str
    source_uri: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class LibrarianIngestResult(CortexModel):
    source_id: str | None = None
    artifact_id: str | None = None
    entity_ids: list[str]
    concept_ids: list[str]
    pattern_ids: list[str]
    relationship_ids: list[str]
    wiki_article_ids: list[str]
    indexed_count: int


class LibrarianExtractRequest(CortexModel):
    text: str
    project_id: str | None = None
    artifact_id: str | None = None


class LibrarianRelationshipRequest(CortexModel):
    source_id: str
    target_id: str
    relationship_type: RelationshipType
    confidence: float | None = None


class LibrarianSyncRequest(CortexModel):
    project_id: str | None = None
    full_reindex: bool = False


class LibrarianAuditIssue(CortexModel):
    issue_type: Literal[
        "duplicate_knowledge",
        "broken_reference",
        "orphan_artifact",
        "stale_knowledge",
        "missing_relationship",
        "missing_metadata",
        "knowledge_gap",
    ]
    object_id: str
    object_type: GraphNodeType | str
    description: str
    severity: Literal["low", "medium", "high"]


class LibrarianAuditReport(CortexModel):
    checked_at: datetime
    project_id: str | None = None
    healthy: bool
    issue_count: int
    issues: list[LibrarianAuditIssue]
