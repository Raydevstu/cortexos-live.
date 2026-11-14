from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from cortexos_types.enums import AgentStatus, WorkRequestPriority, WorkRequestStatus

from .base import Base, BaseMixin, StringArrayCompat, TenantMixin, UuidStr


class AgentModel(Base, BaseMixin, TenantMixin):
    __tablename__ = "agents"

    studio_id: Mapped[str] = mapped_column(
        UuidStr,
        ForeignKey("studios.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    role: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=AgentStatus.IDLE.value,
        index=True,
    )
    health_score: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    current_task: Mapped[str] = mapped_column(String(320), nullable=False, default="")
    model_id: Mapped[str | None] = mapped_column(String(160), nullable=True)


class AgentMemoryModel(Base, BaseMixin, TenantMixin):
    __tablename__ = "agent_memory"

    agent_id: Mapped[str] = mapped_column(
        UuidStr,
        ForeignKey("agents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[str | None] = mapped_column(
        UuidStr,
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    memory_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    importance_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)


class WorkRequestModel(Base, BaseMixin, TenantMixin):
    __tablename__ = "work_requests"

    project_id: Mapped[str] = mapped_column(
        UuidStr,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    studio_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    constraints: Mapped[list[str]] = mapped_column(
        StringArrayCompat,
        nullable=False,
        default=list,
    )
    success_criteria: Mapped[list[str]] = mapped_column(
        StringArrayCompat,
        nullable=False,
        default=list,
    )
    context_artifacts: Mapped[list[str]] = mapped_column(
        StringArrayCompat,
        nullable=False,
        default=list,
    )
    priority: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=WorkRequestPriority.MEDIUM.value,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=WorkRequestStatus.PENDING.value,
        index=True,
    )


class WorkResponseModel(Base, BaseMixin):
    __tablename__ = "work_responses"

    work_request_id: Mapped[str] = mapped_column(
        UuidStr,
        ForeignKey("work_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    studio_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    artifact_ids: Mapped[list[str]] = mapped_column(
        StringArrayCompat,
        nullable=False,
        default=list,
    )
    next_phase: Mapped[str | None] = mapped_column(String(64), nullable=True)
