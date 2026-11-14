from __future__ import annotations

from typing import Sequence

from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.concept import ConceptModel
from app.models.decision import DecisionModel
from app.models.doctrine import DoctrineModel
from app.models.entity import EntityModel
from app.models.knowledge import (
    KnowledgeArticleModel,
    RelationshipModel,
    SearchDocumentModel,
    SourceModel,
)
from app.models.pattern import PatternModel

from .base import BaseRepository


class EntityRepository(BaseRepository[EntityModel]):
    search_columns = ("name", "description", "entity_type")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, EntityModel)


class ConceptRepository(BaseRepository[ConceptModel]):
    search_columns = ("name", "description", "domain")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, ConceptModel)


class DecisionRepository(BaseRepository[DecisionModel]):
    search_columns = ("title", "context", "decision", "reasoning")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, DecisionModel)


class PatternRepository(BaseRepository[PatternModel]):
    search_columns = ("name", "category", "description")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, PatternModel)


class DoctrineRepository(BaseRepository[DoctrineModel]):
    search_columns = ("name", "description")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, DoctrineModel)


class SourceRepository(BaseRepository[SourceModel]):
    search_columns = ("title", "source_uri")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, SourceModel)


class KnowledgeArticleRepository(BaseRepository[KnowledgeArticleModel]):
    search_columns = ("title", "summary", "content")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, KnowledgeArticleModel)


class RelationshipRepository(BaseRepository[RelationshipModel]):
    search_columns = ("relationship_type",)

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, RelationshipModel)

    async def list_for_node(
        self,
        node_id: str,
        *,
        organization_id: str | None = None,
        limit: int = 100,
    ) -> Sequence[RelationshipModel]:
        stmt = self._base_stmt().where(
            or_(
                RelationshipModel.source_id == node_id,
                RelationshipModel.target_id == node_id,
            )
        )
        if organization_id is not None:
            stmt = stmt.where(RelationshipModel.organization_id == organization_id)
        stmt = stmt.limit(limit)
        return (await self.session.execute(stmt)).scalars().all()


class SearchDocumentRepository(BaseRepository[SearchDocumentModel]):
    search_columns = ("content", "source_type")

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, SearchDocumentModel)
