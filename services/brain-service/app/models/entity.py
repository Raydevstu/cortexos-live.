from __future__ import annotations

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, BaseMixin, StringArrayCompat, TenantMixin


class EntityModel(Base, BaseMixin, TenantMixin):
    __tablename__ = "entities"

    name: Mapped[str] = mapped_column(String(240), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    aliases: Mapped[list[str]] = mapped_column(
        StringArrayCompat,
        nullable=False,
        default=list,
    )
