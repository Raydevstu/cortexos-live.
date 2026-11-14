from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import OrganizationModel
from app.models.project import ProjectModel
from app.models.user import UserModel

from .base import BaseRepository


class UserRepository(BaseRepository[UserModel]):
    search_columns = ("name", "email")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, UserModel)

    async def get_by_email(self, email: str) -> UserModel | None:
        stmt = self._base_stmt().where(UserModel.email == email)
        return (await self.session.execute(stmt)).scalar_one_or_none()


class OrganizationRepository(BaseRepository[OrganizationModel]):
    search_columns = ("name", "slug")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, OrganizationModel)

    async def get_by_slug(self, slug: str) -> OrganizationModel | None:
        stmt = self._base_stmt().where(OrganizationModel.slug == slug)
        return (await self.session.execute(stmt)).scalar_one_or_none()


class ProjectRepository(BaseRepository[ProjectModel]):
    search_columns = ("name", "description", "vision")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ProjectModel)

    async def list_by_status_or_phase(
        self,
        *,
        organization_id: str | None = None,
        status: str | None = None,
        phase: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ):
        return await self.list(
            organization_id=organization_id,
            limit=limit,
            offset=offset,
            filters={"status": status, "phase": phase},
        )

    async def get_by_name(self, name: str, organization_id: str) -> ProjectModel | None:
        stmt = self._base_stmt().where(
            ProjectModel.organization_id == organization_id,
            ProjectModel.name == name,
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()
