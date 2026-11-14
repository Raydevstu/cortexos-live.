from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx

from cortexos_artifacts import can_transition_artifact_status
from cortexos_types import Artifact, LibrarianIngestRequest
from cortexos_types.enums import ArtifactStatus, SourceType

from app.core.config import Settings, get_settings
from app.schemas import ArtifactLifecycleRecord

logger = logging.getLogger(__name__)


class ArtifactLifecycleManager:
    """
    Manages the Studio Artifact Creation Lifecycle:
      DRAFT -> REVIEW -> APPROVED -> INDEXED -> CONNECTED
    Persists emitted artifacts to brain-service and dispatches ingestion requests
    to librarian-service with resilient local state tracking.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._records: dict[str, ArtifactLifecycleRecord] = {}
        self._studio_index: dict[str, list[str]] = {}
        self._content_store: dict[str, str] = {}

    async def _persist_to_brain(self, artifact: Artifact) -> bool:
        url = f"{self.settings.brain_service_url}/api/v1/artifacts"
        payload = {
            "organizationId": artifact.organization_id,
            "projectId": artifact.project_id,
            "title": artifact.title,
            "artifactType": str(artifact.artifact_type.value if hasattr(artifact.artifact_type, "value") else artifact.artifact_type),
            "summary": artifact.summary,
            "contentUri": artifact.content_uri,
            "checksum": artifact.checksum,
            "version": artifact.version,
            "tags": artifact.tags,
            "metadata": artifact.metadata,
        }
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                resp = await client.post(url, json=payload)
                return resp.status_code in (200, 201)
        except Exception as exc:
            logger.debug("brain-service persist skipped (%s): %s", artifact.id, exc)
            return False

    async def _dispatch_to_librarian(self, artifact: Artifact, content: str) -> bool:
        url = f"{self.settings.librarian_service_url}/api/v1/librarian/ingest"
        ingest_req = LibrarianIngestRequest(
            organization_id=artifact.organization_id,
            project_id=artifact.project_id,
            artifact_id=artifact.id,
            source_type=SourceType.ARTIFACT,
            title=artifact.title,
            content=content,
            source_uri=artifact.content_uri,
            metadata={"tags": artifact.tags, **artifact.metadata},
        )
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                resp = await client.post(
                    url,
                    json=ingest_req.model_dump(by_alias=True, exclude_none=True),
                )
                return resp.status_code in (200, 201, 202)
        except Exception as exc:
            logger.debug("librarian-service ingest skipped (%s): %s", artifact.id, exc)
            return False

    async def register_artifact(
        self,
        *,
        studio_id: str,
        artifact: Artifact,
        content: str,
        actor_id: str,
    ) -> ArtifactLifecycleRecord:
        now = datetime.now(timezone.utc)
        persisted = await self._persist_to_brain(artifact)
        ingested = await self._dispatch_to_librarian(artifact, content)

        record = ArtifactLifecycleRecord(
            artifact=artifact,
            current_stage=artifact.status,
            persisted_in_brain=persisted,
            ingested_by_librarian=ingested,
            stage_history=[
                {
                    "fromStatus": None,
                    "toStatus": str(artifact.status.value if hasattr(artifact.status, "value") else artifact.status),
                    "actorId": actor_id,
                    "reason": f"Created by {studio_id} studio runtime",
                    "transitionedAt": now.isoformat(),
                }
            ],
        )
        self._records[artifact.id] = record
        self._content_store[artifact.id] = content
        bucket = self._studio_index.setdefault(studio_id, [])
        if artifact.id not in bucket:
            bucket.append(artifact.id)
        return record

    def transition(
        self,
        *,
        artifact_id: str,
        target_status: ArtifactStatus,
        actor_id: str,
        reason: str | None = None,
    ) -> ArtifactLifecycleRecord:
        record = self._records.get(artifact_id)
        if record is None:
            raise KeyError(f"Artifact '{artifact_id}' not found in lifecycle registry.")

        current = record.current_stage
        if not can_transition_artifact_status(current, target_status):
            raise ValueError(
                f"Invalid artifact lifecycle transition: '{current.value}' -> '{target_status.value}'."
            )

        if current != target_status:
            now = datetime.now(timezone.utc)
            updated_artifact = record.artifact.model_copy(
                update={"status": target_status, "updated_at": now}
            )
            record = record.model_copy(
                update={
                    "artifact": updated_artifact,
                    "current_stage": target_status,
                    "stage_history": [
                        *record.stage_history,
                        {
                            "fromStatus": current.value,
                            "toStatus": target_status.value,
                            "actorId": actor_id,
                            "reason": reason or f"Transitioned to {target_status.value}",
                            "transitionedAt": now.isoformat(),
                        },
                    ],
                }
            )
            self._records[artifact_id] = record
        return record

    def get_record(self, artifact_id: str) -> ArtifactLifecycleRecord | None:
        return self._records.get(artifact_id)

    def get_content(self, artifact_id: str) -> str | None:
        return self._content_store.get(artifact_id)

    def list_by_studio(self, studio_id: str) -> list[ArtifactLifecycleRecord]:
        ids = self._studio_index.get(studio_id, [])
        return [self._records[aid] for aid in ids if aid in self._records]
