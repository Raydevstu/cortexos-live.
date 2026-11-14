from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from cortexos_types.enums import WorkflowStatus

from .base import Base, BaseMixin, JSONBCompat, TenantMixin, UuidStr, utcnow


class WorkflowModel(Base, BaseMixin, TenantMixin):
    __tablename__ = "workflows"

    project_id: Mapped[str] = mapped_column(
        UuidStr,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workflow_type: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    namespace: Mapped[str] = mapped_column(String(64), nullable=False, default="projects")
    task_queue: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="jarvis-system",
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=WorkflowStatus.PENDING.value,
        index=True,
    )
    current_step: Mapped[str] = mapped_column(String(160), nullable=False, default="init")
    temporal_run_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    input_payload: Mapped[dict[str, Any]] = mapped_column(
        JSONBCompat,
        nullable=False,
        default=dict,
    )
    result_payload: Mapped[dict[str, Any]] = mapped_column(
        JSONBCompat,
        nullable=False,
        default=dict,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class WorkflowExecutionModel(Base, BaseMixin):
    __tablename__ = "workflow_executions"

    workflow_id: Mapped[str] = mapped_column(
        UuidStr,
        ForeignKey("workflows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    execution_id: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=WorkflowStatus.RUNNING.value,
        index=True,
    )
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
