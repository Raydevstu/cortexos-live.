from __future__ import annotations

from typing import Any

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from cortexos_types.enums import SecurityRole, UserStatus

from .base import Base, BaseMixin, JSONBCompat


class UserModel(Base, BaseMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    role: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=SecurityRole.BUILDER.value,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=UserStatus.ACTIVE.value,
        index=True,
    )
    preferences: Mapped[dict[str, Any]] = mapped_column(
        JSONBCompat,
        nullable=False,
        default=dict,
    )
