from __future__ import annotations

import uuid
from datetime import datetime, timezone

from cortexos_types import Concept, Entity, Pattern, Relationship
from cortexos_types.enums import RelationshipType

from app.schemas.librarian import ExtractionBundle


def _edge_id(source_id: str, target_id: str, rel_type: RelationshipType) -> str:
    return str(
        uuid.uuid5(
            uuid.NAMESPACE_URL,
            f"cortexos:edge:{source_id}:{rel_type.value}:{target_id}",
        )
    )


def build_relationships(
    *,
    origin_id: str,
    bundle: ExtractionBundle,
    organization_id: str | None = None,
    project_id: str | None = None,
    valid_node_ids: set[str] | None = None,
) -> list[Relationship]:
    """Construct validated Relationship edges with zero self-loops and no dangling endpoints."""
    now = datetime.now(timezone.utc)
    relationships: dict[tuple[str, str, RelationshipType], Relationship] = {}

    known_ids: set[str] = {origin_id}
    if project_id:
        known_ids.add(project_id)
    for item in [*bundle.entities, *bundle.concepts, *bundle.patterns]:
        known_ids.add(item.id)
    if valid_node_ids:
        known_ids.update(valid_node_ids)

    def _add(src: str, dst: str, rel_type: RelationshipType, confidence: float) -> None:
        if not src or not dst or src == dst:
            return
        if src not in known_ids or dst not in known_ids:
            return
        key = (src, dst, rel_type)
        if key not in relationships:
            relationships[key] = Relationship(
                id=_edge_id(src, dst, rel_type),
                organization_id=organization_id,
                source_id=src,
                target_id=dst,
                relationship_type=rel_type,
                weight=1.0,
                confidence=confidence,
                created_at=now,
                updated_at=now,
            )

    if project_id and project_id != origin_id:
        _add(project_id, origin_id, RelationshipType.CONTAINS, 1.0)

    for entity in bundle.entities:
        _add(origin_id, entity.id, RelationshipType.USES, 0.92)

    for concept in bundle.concepts:
        _add(origin_id, concept.id, RelationshipType.REFERENCES, 0.88)

    for pattern in bundle.patterns:
        _add(origin_id, pattern.id, RelationshipType.IMPLEMENTS, 0.9)

    return list(relationships.values())
