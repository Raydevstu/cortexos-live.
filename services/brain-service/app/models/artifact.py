from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from cortexos_types.enums import ArtifactStatus

from .base import Base, BaseMixin, TenantMixin, UuidStr, utcnow


class ArtifactModel(Base, BaseMixin, TenantMixin):
    __tablename__ = "artifacts"
    __table_args__ = (
        Index("ix_artifacts_project_type", "project_id", "artifact_type"),
        Index("ix_artifacts_project_status", "project_id", "status"),
    )

    project_id: Mapped[str] = mapped_column(
        UuidStr,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    artifact_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[str] = mapped_column(String(32), nullable=False, default="1.0.0")
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=ArtifactStatus.DRAFT.value,
        index=True,
    )
    content_uri: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    checksum: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    approved_by: Mapped[str | None] = mapped_column(UuidStr, nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class ArtifactVersionModel(Base, BaseMixin):
    __tablename__ = "artifact_versions"

    artifact_id: Mapped[str] = mapped_column(
        UuidStr,
        ForeignKey("artifacts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version: Mapped[str] = mapped_column(String(32), nullable=False)
    content_uri: Mapped[str] = mapped_column(String(1024), nullable=False)
    change_summary: Mapped[str] = mapped_column(Text, nullable=False)
    versioned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
