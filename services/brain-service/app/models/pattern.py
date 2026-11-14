from __future__ import annotations

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, BaseMixin, TenantMixin


class PatternModel(Base, BaseMixin, TenantMixin):
    __tablename__ = "patterns"

    name: Mapped[str] = mapped_column(String(240), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reusability_score: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
