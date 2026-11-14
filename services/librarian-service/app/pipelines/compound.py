from __future__ import annotations

import uuid
from collections import Counter
from datetime import datetime, timezone

from cortexos_types import Doctrine, KnowledgeArticle, Pattern, Relationship
from cortexos_types.enums import KnowledgeArticleType, RelationshipType

from app.schemas.librarian import CompoundResult


def run_compounding(
    *,
    patterns: list[Pattern],
    existing_doctrines: list[Doctrine],
    relationships: list[Relationship],
    organization_id: str | None = None,
    min_reuse_for_doctrine: int = 5,
) -> CompoundResult:
    """Promote repeatedly reused patterns into Doctrines and synthesize cross-project intelligence."""
    now = datetime.now(timezone.utc)
    promoted_by_pattern = {d.source_pattern_id for d in existing_doctrines}

    reuse_counts: Counter[str] = Counter()
    for rel in relationships:
        if rel.relationship_type in (
            RelationshipType.IMPLEMENTS,
            RelationshipType.USES,
            RelationshipType.REFERENCES,
        ):
            reuse_counts[rel.target_id] += 1

    promoted_doctrines: list[Doctrine] = []
    discovered_relationships: list[Relationship] = []
    consolidated_articles: list[KnowledgeArticle] = []
    pattern_reuse_map: dict[str, int] = {}

    for pattern in patterns:
        count = reuse_counts.get(pattern.id, 0)
        pattern_reuse_map[pattern.name] = count
        if count >= min_reuse_for_doctrine and pattern.id not in promoted_by_pattern:
            doctrine_id = str(
                uuid.uuid5(uuid.NAMESPACE_URL, f"cortexos:doctrine:{pattern.id}")
            )
            doctrine = Doctrine(
                id=doctrine_id,
                organization_id=organization_id,
                name=f"{pattern.name} Doctrine",
                description=(
                    f"Promoted automatically after {count} verified cross-project usages: "
                    f"{pattern.description}"
                ),
                source_pattern_id=pattern.id,
                approved_by=None,
                created_at=now,
                updated_at=now,
            )
            promoted_doctrines.append(doctrine)
            discovered_relationships.append(
                Relationship(
                    id=str(
                        uuid.uuid5(
                            uuid.NAMESPACE_URL,
                            f"cortexos:edge:{doctrine.id}:DERIVED_FROM:{pattern.id}",
                        )
                    ),
                    organization_id=organization_id,
                    source_id=doctrine.id,
                    target_id=pattern.id,
                    relationship_type=RelationshipType.DERIVED_FROM,
                    weight=1.0,
                    confidence=0.98,
                    created_at=now,
                    updated_at=now,
                )
            )
            consolidated_articles.append(
                KnowledgeArticle(
                    id=str(
                        uuid.uuid5(
                            uuid.NAMESPACE_URL,
                            f"cortexos:wiki:doctrines/{doctrine.id}",
                        )
                    ),
                    organization_id=organization_id,
                    title=doctrine.name,
                    article_type=KnowledgeArticleType.DOCTRINE,
                    content=f"# {doctrine.name}\n\n## Standard\n{doctrine.description}\n",
                    summary=doctrine.description,
                    generated_by="librarian-compounding-engine",
                    created_at=now,
                    updated_at=now,
                )
            )

    return CompoundResult(
        promoted_doctrines=promoted_doctrines,
        discovered_relationships=discovered_relationships,
        consolidated_articles=consolidated_articles,
        pattern_reuse_counts=pattern_reuse_map,
    )
