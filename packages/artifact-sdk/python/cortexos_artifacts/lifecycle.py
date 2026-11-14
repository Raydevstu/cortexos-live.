from __future__ import annotations

from datetime import datetime

from cortexos_types import CortexModel
from cortexos_types.enums import ArtifactStatus

ARTIFACT_LIFECYCLE_ORDER: tuple[ArtifactStatus, ...] = (
    ArtifactStatus.DRAFT,
    ArtifactStatus.REVIEW,
    ArtifactStatus.APPROVED,
    ArtifactStatus.INDEXED,
    ArtifactStatus.CONNECTED,
    ArtifactStatus.ARCHIVED,
)

ALLOWED_ARTIFACT_TRANSITIONS: dict[ArtifactStatus, tuple[ArtifactStatus, ...]] = {
    ArtifactStatus.DRAFT: (ArtifactStatus.REVIEW, ArtifactStatus.ARCHIVED),
    ArtifactStatus.REVIEW: (ArtifactStatus.DRAFT, ArtifactStatus.APPROVED, ArtifactStatus.ARCHIVED),
    ArtifactStatus.APPROVED: (ArtifactStatus.INDEXED, ArtifactStatus.ARCHIVED),
    ArtifactStatus.INDEXED: (ArtifactStatus.CONNECTED, ArtifactStatus.ARCHIVED),
    ArtifactStatus.CONNECTED: (ArtifactStatus.ARCHIVED,),
    ArtifactStatus.ARCHIVED: (),
}


def can_transition_artifact_status(
    current: ArtifactStatus, target: ArtifactStatus
) -> bool:
    if current == target:
        return True
    return target in ALLOWED_ARTIFACT_TRANSITIONS.get(current, ())


class ArtifactLifecycleTransition(CortexModel):
    artifact_id: str
    from_status: ArtifactStatus
    to_status: ArtifactStatus
    actor_id: str
    reason: str | None = None
    transitioned_at: datetime
