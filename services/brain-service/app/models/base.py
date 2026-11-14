from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, ForeignKey, JSON, String, Uuid
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid.uuid4())


JSONBCompat = JSON().with_variant(JSONB(astext_type=None), "postgresql")
StringArrayCompat = JSON().with_variant(ARRAY(String()), "postgresql")
UuidStr = Uuid(as_uuid=False)


class Base(DeclarativeBase):
    """Canonical SQLAlchemy 2.0 Declarative Base for CortexOS System of Record."""


class BaseMixin:
    """Canonical BaseMixin: id, timestamps, soft-delete, and actor audit fields."""

    id: Mapped[str] = mapped_column(
        UuidStr,
        primary_key=True,
        default=new_uuid,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        index=True,
    )
    created_by: Mapped[str | None] = mapped_column(
        UuidStr,
        nullable=True,
        default=None,
    )
    updated_by: Mapped[str | None] = mapped_column(
        UuidStr,
        nullable=True,
        default=None,
    )


class TenantMixin:
    """Multi-tenancy + tagging + flexible JSONB metadata mixin."""

    organization_id: Mapped[str] = mapped_column(
        UuidStr,
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    tags: Mapped[list[str]] = mapped_column(
        StringArrayCompat,
        nullable=False,
        default=list,
    )
    metadata_payload: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONBCompat,
        nullable=False,
        default=dict,
    )
