from __future__ import annotations

from typing import Any, Generic, Sequence, TypeVar

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base, utcnow

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Canonical SQLAlchemy 2.0 Repository enforcing soft deletes and tenant scoping."""

    search_columns: tuple[str, ...] = ()

    def __init__(self, session: AsyncSession, model: type[ModelT]) -> None:
        self.session = session
        self.model = model

    def _base_stmt(self, include_deleted: bool = False):
        stmt = select(self.model)
        if not include_deleted and hasattr(self.model, "deleted_at"):
            stmt = stmt.where(getattr(self.model, "deleted_at").is_(None))
        return stmt

    async def create(self, obj: ModelT) -> ModelT:
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, obj: ModelT, values: dict[str, Any]) -> ModelT:
        for key, value in values.items():
            if hasattr(obj, key):
                setattr(obj, key, value)
        if hasattr(obj, "updated_at"):
            setattr(obj, "updated_at", utcnow())
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def delete(
        self,
        item_id: str,
        *,
        deleted_by: str | None = None,
    ) -> ModelT | None:
        """Soft delete only; records deleted_at timestamp."""
        obj = await self.get_by_id(item_id)
        if obj is None:
            return None
        if hasattr(obj, "deleted_at"):
            setattr(obj, "deleted_at", utcnow())
        if deleted_by is not None and hasattr(obj, "updated_by"):
            setattr(obj, "updated_by", deleted_by)
        if hasattr(obj, "updated_at"):
            setattr(obj, "updated_at", utcnow())
        await self.session.flush()
        return obj

    async def get_by_id(
        self,
        item_id: str,
        *,
        organization_id: str | None = None,
        include_deleted: bool = False,
    ) -> ModelT | None:
        stmt = self._base_stmt(include_deleted=include_deleted).where(
            getattr(self.model, "id") == item_id
        )
        if organization_id is not None and hasattr(self.model, "organization_id"):
            stmt = stmt.where(getattr(self.model, "organization_id") == organization_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        organization_id: str | None = None,
        limit: int = 50,
        offset: int = 0,
        filters: dict[str, Any] | None = None,
    ) -> tuple[Sequence[ModelT], int]:
        stmt = self._base_stmt()
        if organization_id is not None and hasattr(self.model, "organization_id"):
            stmt = stmt.where(getattr(self.model, "organization_id") == organization_id)
        if filters:
            for field, value in filters.items():
                if value is not None and hasattr(self.model, field):
                    stmt = stmt.where(getattr(self.model, field) == value)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = int((await self.session.execute(count_stmt)).scalar_one())

        if hasattr(self.model, "created_at"):
            stmt = stmt.order_by(getattr(self.model, "created_at").desc())
        stmt = stmt.limit(limit).offset(offset)
        rows = (await self.session.execute(stmt)).scalars().all()
        return rows, total

    async def search(
        self,
        query: str,
        *,
        organization_id: str | None = None,
        limit: int = 25,
    ) -> Sequence[ModelT]:
        stmt = self._base_stmt()
        if organization_id is not None and hasattr(self.model, "organization_id"):
            stmt = stmt.where(getattr(self.model, "organization_id") == organization_id)
        if query and self.search_columns:
            pattern = f"%{query}%"
            clauses = [
                getattr(self.model, col).ilike(pattern)
                for col in self.search_columns
                if hasattr(self.model, col)
            ]
            if clauses:
                stmt = stmt.where(or_(*clauses))
        stmt = stmt.limit(limit)
        return (await self.session.execute(stmt)).scalars().all()
