from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, BaseMixin, TenantMixin, UuidStr, utcnow


class SourceModel(Base, BaseMixin, TenantMixin):
    __tablename__ = "sources"

    project_id: Mapped[str | None] = mapped_column(
        UuidStr,
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(320), nullable=False)
    source_uri: Mapped[str] = mapped_column(String(1024), nullable=False)
    raw_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    checksum: Mapped[str] = mapped_column(String(128), nullable=False, index=True)


class KnowledgeArticleModel(Base, BaseMixin, TenantMixin):
    __tablename__ = "knowledge_articles"

    title: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    article_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    generated_by: Mapped[str] = mapped_column(String(120), nullable=False)


class RelationshipModel(Base, BaseMixin, TenantMixin):
    __tablename__ = "relationships"
    __table_args__ = (
        UniqueConstraint(
            "source_id",
            "target_id",
            "relationship_type",
            name="uq_relationships_edge",
        ),
        Index("ix_relationships_source_target", "source_id", "target_id"),
    )

    source_id: Mapped[str] = mapped_column(UuidStr, nullable=False, index=True)
    target_id: Mapped[str] = mapped_column(UuidStr, nullable=False, index=True)
    relationship_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True, default=1.0)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True, default=1.0)


class SearchDocumentModel(Base, BaseMixin):
    __tablename__ = "search_documents"
    __table_args__ = (
        Index("ix_search_documents_source", "source_type", "source_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        UuidStr,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(UuidStr, nullable=False, index=True)
    project_id: Mapped[str | None] = mapped_column(UuidStr, nullable=True, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    indexed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
