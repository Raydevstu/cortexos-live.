from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from cortexos_types import (
    Artifact,
    Concept,
    Decision,
    Entity,
    LibrarianAuditIssue,
    LibrarianAuditReport,
    Pattern,
    Relationship,
)


def run_knowledge_audit(
    *,
    artifacts: list[Artifact],
    entities: list[Entity],
    concepts: list[Concept],
    decisions: list[Decision],
    patterns: list[Pattern],
    relationships: list[Relationship],
    project_id: str | None = None,
    stale_days: int = 90,
) -> LibrarianAuditReport:
    """Continuously audit knowledge health: duplicates, broken refs, orphans, stale nodes, and gaps."""
    now = datetime.now(timezone.utc)
    issues: list[LibrarianAuditIssue] = []

    known_ids: set[str] = {
        *(a.id for a in artifacts),
        *(e.id for e in entities),
        *(c.id for c in concepts),
        *(d.id for d in decisions),
        *(p.id for p in patterns),
    }

    # 1. Duplicate knowledge detection (case-insensitive entity/concept names)
    entity_names: dict[str, list[str]] = defaultdict(list)
    for entity in entities:
        entity_names[entity.name.strip().lower()].append(entity.id)
    for name, ids in entity_names.items():
        if len(ids) > 1:
            issues.append(
                LibrarianAuditIssue(
                    issue_type="duplicate_knowledge",
                    object_id=ids[1],
                    object_type="Entity",
                    description=f"Duplicate entity detected for normalized name '{name}'",
                    severity="medium",
                )
            )

    # 2. Broken relationship references + connected node tracking
    connected_ids: set[str] = set()
    for rel in relationships:
        connected_ids.add(rel.source_id)
        connected_ids.add(rel.target_id)
        if rel.source_id not in known_ids or rel.target_id not in known_ids:
            issues.append(
                LibrarianAuditIssue(
                    issue_type="broken_reference",
                    object_id=rel.id,
                    object_type="Relationship",
                    description=f"Relationship '{rel.id}' references missing node ({rel.source_id} -> {rel.target_id})",
                    severity="high",
                )
            )

    # 3. Orphan artifacts, missing metadata, and stale knowledge checks
    stale_cutoff = now - timedelta(days=stale_days)
    for artifact in artifacts:
        if project_id and artifact.project_id != project_id:
            continue
        if artifact.id not in connected_ids:
            issues.append(
                LibrarianAuditIssue(
                    issue_type="orphan_artifact",
                    object_id=artifact.id,
                    object_type="Artifact",
                    description=f"Artifact '{artifact.title}' has no Knowledge Graph relationships",
                    severity="high",
                )
            )
        if not artifact.summary:
            issues.append(
                LibrarianAuditIssue(
                    issue_type="missing_metadata",
                    object_id=artifact.id,
                    object_type="Artifact",
                    description=f"Artifact '{artifact.title}' is missing summary metadata",
                    severity="low",
                )
            )
        updated_at = artifact.updated_at
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)
        if updated_at < stale_cutoff:
            issues.append(
                LibrarianAuditIssue(
                    issue_type="stale_knowledge",
                    object_id=artifact.id,
                    object_type="Artifact",
                    description=f"Artifact '{artifact.title}' has not been reviewed in over {stale_days} days",
                    severity="medium",
                )
            )

    # 4. Knowledge gap: project artifacts exist without recorded architectural decisions
    scoped_artifacts = [a for a in artifacts if not project_id or a.project_id == project_id]
    scoped_decisions = [d for d in decisions if not project_id or d.project_id == project_id]
    if scoped_artifacts and not scoped_decisions:
        issues.append(
            LibrarianAuditIssue(
                issue_type="knowledge_gap",
                object_id=project_id or scoped_artifacts[0].project_id,
                object_type="Project",
                description="Project has artifacts but zero captured architectural decisions",
                severity="medium",
            )
        )

    return LibrarianAuditReport(
        checked_at=now,
        project_id=project_id,
        healthy=len(issues) == 0,
        issue_count=len(issues),
        issues=issues,
    )
