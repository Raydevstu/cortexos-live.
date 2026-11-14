from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from cortexos_types.enums import DecisionStatus

from .base import Base, BaseMixin, TenantMixin, UuidStr


class DecisionModel(Base, BaseMixin, TenantMixin):
    __tablename__ = "decisions"

    project_id: Mapped[str] = mapped_column(
        UuidStr,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    context: Mapped[str] = mapped_column(Text, nullable=False)
    decision: Mapped[str] = mapped_column(Text, nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    impact: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=DecisionStatus.PROPOSED.value,
        index=True,
    )
