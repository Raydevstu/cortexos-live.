from __future__ import annotations

from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLogModel
from app.models.event import EventModel
from app.models.workflow import WorkflowExecutionModel, WorkflowModel

from .base import BaseRepository


class WorkflowRepository(BaseRepository[WorkflowModel]):
    search_columns = ("workflow_type", "current_step", "status")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, WorkflowModel)


class WorkflowExecutionRepository(BaseRepository[WorkflowExecutionModel]):
    search_columns = ("execution_id", "status")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, WorkflowExecutionModel)


class EventRepository(BaseRepository[EventModel]):
    search_columns = ("event_type", "source", "status")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, EventModel)

    async def list_pending(self, limit: int = 100) -> Sequence[EventModel]:
        stmt = (
            self._base_stmt()
            .where(EventModel.status == "pending")
            .order_by(EventModel.timestamp.asc())
            .limit(limit)
        )
        return (await self.session.execute(stmt)).scalars().all()


class AuditLogRepository(BaseRepository[AuditLogModel]):
    search_columns = ("entity_type", "action")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, AuditLogModel)
