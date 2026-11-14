from __future__ import annotations

from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.artifact import ArtifactModel, ArtifactVersionModel

from .base import BaseRepository


class ArtifactRepository(BaseRepository[ArtifactModel]):
    search_columns = ("title", "summary", "artifact_type")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ArtifactModel)

    async def list_filtered(
        self,
        *,
        organization_id: str | None = None,
        project_id: str | None = None,
        artifact_type: str | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[Sequence[ArtifactModel], int]:
        return await self.list(
            organization_id=organization_id,
            limit=limit,
            offset=offset,
            filters={
                "project_id": project_id,
                "artifact_type": artifact_type,
                "status": status,
            },
        )


class ArtifactVersionRepository(BaseRepository[ArtifactVersionModel]):
    search_columns = ("version", "change_summary")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ArtifactVersionModel)

    async def list_for_artifact(self, artifact_id: str) -> Sequence[ArtifactVersionModel]:
        stmt = (
            self._base_stmt()
            .where(ArtifactVersionModel.artifact_id == artifact_id)
            .order_by(ArtifactVersionModel.versioned_at.desc())
        )
        return (await self.session.execute(stmt)).scalars().all()
