from __future__ import annotations

from typing import Any

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from cortexos_types.enums import OrganizationPlan

from .base import Base, BaseMixin, JSONBCompat


class OrganizationModel(Base, BaseMixin):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    plan: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=OrganizationPlan.FREE.value,
    )
    settings: Mapped[dict[str, Any]] = mapped_column(
        JSONBCompat,
        nullable=False,
        default=dict,
    )
