from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from cortexos_types.enums import EventDeliveryStatus

from .base import Base, JSONBCompat, UuidStr, new_uuid, utcnow


class EventModel(Base):
    """Transactional event outbox table (system-level, never dropped)."""

    __tablename__ = "events"

    id: Mapped[str] = mapped_column(UuidStr, primary_key=True, default=new_uuid)
    event_type: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    organization_id: Mapped[str | None] = mapped_column(UuidStr, nullable=True, index=True)
    project_id: Mapped[str | None] = mapped_column(UuidStr, nullable=True, index=True)
    source: Mapped[str] = mapped_column(String(120), nullable=False, default="brain-service")
    correlation_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(
        String(160),
        nullable=True,
        unique=True,
        index=True,
    )
    payload: Mapped[dict[str, Any]] = mapped_column(
        JSONBCompat,
        nullable=False,
        default=dict,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=EventDeliveryStatus.PENDING.value,
        index=True,
    )
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        index=True,
    )
