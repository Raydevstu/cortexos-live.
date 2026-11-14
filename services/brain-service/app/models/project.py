from __future__ import annotations

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from cortexos_types.enums import ProjectPhase, ProjectStatus

from .base import Base, BaseMixin, TenantMixin, UuidStr


class ProjectModel(Base, BaseMixin, TenantMixin):
    __tablename__ = "projects"
    __table_args__ = (
        Index("ix_projects_org_status", "organization_id", "status"),
        Index("ix_projects_org_phase", "organization_id", "phase"),
    )

    name: Mapped[str] = mapped_column(String(240), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=ProjectStatus.DRAFT.value,
        index=True,
    )
    phase: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=ProjectPhase.DISCOVERY.value,
        index=True,
    )
    owner_id: Mapped[str] = mapped_column(
        UuidStr,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    vision: Mapped[str | None] = mapped_column(Text, nullable=True)
