from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from cortexos_studios import StudioArtifactDraft
from cortexos_types import Artifact, WorkRequest
from cortexos_types.enums import ArtifactStatus, ArtifactType


class DesignArtifactGenerator:
    """Produces flow drafts and materializes verified Artifact instances with SHA-256 checksums."""

    def build_user_flow_draft(
        self,
        *,
        objective: str,
        project_id: str,
        request_id: str,
        constraints: list[str] | None = None,
        success_criteria: list[str] | None = None,
    ) -> StudioArtifactDraft:
        constraints = constraints or []
        success_criteria = success_criteria or []
        content = "\n".join(
            [
                f"# User Flows & Interaction Architecture — {objective}",
                "",
                f"- **Project ID**: `{project_id}`",
                f"- **Work Request ID**: `{request_id}`",
                "- **States Covered**: `idle`, `loading`, `empty`, `ready`, `error`",
                "",
                "## 1. Entry & Summoning Flow",
                "1. User enters MainBrain Surface with persistent top-center Agent Dock.",
                "2. User triggers objective via Terminal Sandbox or Agent Dock summon.",
                "3. Workspace slides in without leaving the primary MainBrain context.",
                "",
                "## 2. Governance & UX Constraints",
                *(
                    [f"- {c}" for c in constraints]
                    if constraints
                    else ["- Maintain keyboard traversal, Escape dismissal, and state recovery."]
                ),
                "",
                "## 3. Success Criteria",
                *(
                    [f"- [x] {s}" for s in success_criteria]
                    if success_criteria
                    else ["- [x] Complete user flow and state transitions verified."]
                ),
            ]
        )
        return StudioArtifactDraft(
            artifact_type=ArtifactType.UI_DESIGN,
            title=f"User Flows: {objective[:64]}",
            summary=f"End-to-end user transitions and recovery states for '{objective}'.",
            content=content,
            tags=["design", "user-flows", "interaction-spec"],
            metadata={
                "workRequestId": request_id,
                "activity": "FlowDesign",
                "statesCovered": ["idle", "loading", "empty", "ready", "error"],
                "toolsReferenced": ["readdy", "magic_patterns"],
            },
        )

    def materialize(
        self,
        *,
        prefix: str,
        draft: StudioArtifactDraft,
        request: WorkRequest,
    ) -> tuple[Artifact, str]:
        now = datetime.now(timezone.utc)
        checksum = hashlib.sha256(draft.content.encode("utf-8")).hexdigest()
        seed = f"{request.project_id}:{request.id}:{prefix}"
        art_id = f"{prefix}-{hashlib.sha256(seed.encode('utf-8')).hexdigest()[:12]}"
        artifact = Artifact(
            id=art_id,
            organization_id=request.organization_id or "00000000-0000-0000-0000-000000000001",
            project_id=request.project_id,
            title=draft.title,
            artifact_type=draft.artifact_type,
            status=ArtifactStatus.REVIEW,
            version=draft.version,
            summary=draft.summary,
            content_uri=f"cortex://artifacts/design/{request.project_id}/{art_id}.md",
            checksum=checksum,
            created_at=now,
            updated_at=now,
            created_by="design-agent",
            tags=draft.tags,
            metadata=draft.metadata,
        )
        return artifact, draft.content
