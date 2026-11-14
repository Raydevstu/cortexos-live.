from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, JSONBCompat, UuidStr, new_uuid, utcnow


class AuditLogModel(Base):
    """Immutable system audit log table."""

    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(UuidStr, primary_key=True, default=new_uuid)
    organization_id: Mapped[str | None] = mapped_column(UuidStr, nullable=True, index=True)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_id: Mapped[str] = mapped_column(UuidStr, nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    changed_by: Mapped[str] = mapped_column(UuidStr, nullable=False)
    changes: Mapped[dict[str, Any]] = mapped_column(
        JSONBCompat,
        nullable=False,
        default=dict,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        index=True,
    )
