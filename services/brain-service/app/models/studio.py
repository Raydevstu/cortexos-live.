from __future__ import annotations

from typing import Any

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from cortexos_types.enums import StudioStatus

from .base import Base, BaseMixin, JSONBCompat


class StudioModel(Base, BaseMixin):
    __tablename__ = "studios"

    slug: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False, default="1.0.0")
    mission: Mapped[str] = mapped_column(Text, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=StudioStatus.ACTIVE.value,
        index=True,
    )
    manifest: Mapped[dict[str, Any]] = mapped_column(
        JSONBCompat,
        nullable=False,
        default=dict,
    )
