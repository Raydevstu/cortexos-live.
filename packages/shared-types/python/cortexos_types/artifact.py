from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import Field

from .base import BaseEntity, CortexModel, TenantScopedEntity
from .enums import ArtifactStatus, ArtifactType, ReviewType


class BaseArtifact(TenantScopedEntity):
    project_id: str
    title: str
    artifact_type: ArtifactType
    status: ArtifactStatus
    version: str
    summary: str | None = None
    content_uri: str | None = None
    checksum: str | None = None
    approved_by: str | None = None
    approved_at: datetime | None = None


Artifact = BaseArtifact


class ArtifactVersion(BaseEntity):
    artifact_id: str
    version: str
    content_uri: str
    change_summary: str


class CreateArtifactRequest(CortexModel):
    organization_id: str | None = None
    project_id: str
    title: str
    artifact_type: ArtifactType
    version: str = "1.0.0"
    summary: str | None = None
    content: str | None = None
    content_uri: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class UpdateArtifactRequest(CortexModel):
    title: str | None = None
    status: ArtifactStatus | None = None
    version: str | None = None
    summary: str | None = None
    content_uri: str | None = None
    checksum: str | None = None
    approved_by: str | None = None
    approved_at: datetime | None = None
    tags: list[str] | None = None
    metadata: dict[str, Any] | None = None


class ArtifactSearchParams(CortexModel):
    project_id: str | None = None
    artifact_type: ArtifactType | None = None
    status: ArtifactStatus | None = None
    limit: int | None = None
    offset: int | None = None


class ArtifactReviewRequest(CortexModel):
    artifact_id: str
    review_type: ReviewType
    reviewer_id: str
    comments: str | None = None
    findings: list[str] = Field(default_factory=list)


class ArtifactApprovalRequest(CortexModel):
    artifact_id: str
    approved: bool
    decided_by: str
    decided_at: datetime
    reason: str | None = None


class ArtifactIngestionMetadata(CortexModel):
    artifact_id: str
    entity_ids: list[str]
    concept_ids: list[str]
    pattern_ids: list[str]
    relationship_ids: list[str]
    wiki_article_ids: list[str]
    indexed_at: datetime
