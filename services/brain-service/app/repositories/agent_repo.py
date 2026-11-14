from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent import (
    AgentMemoryModel,
    AgentModel,
    WorkRequestModel,
    WorkResponseModel,
)
from app.models.studio import StudioModel

from .base import BaseRepository


class StudioRepository(BaseRepository[StudioModel]):
    search_columns = ("slug", "name", "mission")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, StudioModel)


class AgentRepository(BaseRepository[AgentModel]):
    search_columns = ("name", "role", "current_task")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, AgentModel)


class AgentMemoryRepository(BaseRepository[AgentMemoryModel]):
    search_columns = ("memory_type", "content")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, AgentMemoryModel)


class WorkRequestRepository(BaseRepository[WorkRequestModel]):
    search_columns = ("studio_id", "objective", "status")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, WorkRequestModel)


class WorkResponseRepository(BaseRepository[WorkResponseModel]):
    search_columns = ("studio_id", "summary", "status")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, WorkResponseModel)
