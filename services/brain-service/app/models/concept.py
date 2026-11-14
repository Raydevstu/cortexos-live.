from __future__ import annotations

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, BaseMixin, StringArrayCompat, TenantMixin


class ConceptModel(Base, BaseMixin, TenantMixin):
    __tablename__ = "concepts"

    name: Mapped[str] = mapped_column(String(240), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    keywords: Mapped[list[str]] = mapped_column(
        StringArrayCompat,
        nullable=False,
        default=list,
    )
