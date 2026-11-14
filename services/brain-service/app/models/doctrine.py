from __future__ import annotations

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, BaseMixin, TenantMixin, UuidStr


class DoctrineModel(Base, BaseMixin, TenantMixin):
    __tablename__ = "doctrines"

    name: Mapped[str] = mapped_column(String(240), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    source_pattern_id: Mapped[str] = mapped_column(
        UuidStr,
        ForeignKey("patterns.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    approved_by: Mapped[str | None] = mapped_column(UuidStr, nullable=True)
