from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from cortexos_types import (
    Artifact,
    StudioExecuteRequest,
    StudioHandoffRequest,
    StudioSummarizeRequest,
    StudioValidateRequest,
    TerminalContextStack,
    WorkResponse,
)
from cortexos_types.enums import ArtifactStatus, ModelCapability, TerminalMode

from app.context_stack import ContextStackBuilder
from app.core.config import Settings, get_settings
from app.lifecycle import ArtifactLifecycleManager
from app.loader import StudioLoader
from app.registry import StudioRegistry
from app.sandbox import StudioSandboxGuard
from app.schemas import (
    ArtifactLifecycleRecord,
    ContextBuildRequest,
    ContextStackResponse,
    LoadedStudioProfile,
    StudioHandoffReceipt,
    StudioSummarizeResponse,
    StudioValidateResponse,
)

logger = logging.getLogger(__name__)


class StudioRuntime:
    """Orchestrates Studio discovery, 6-layer Context Stack binding, sandboxed execution, lifecycle, validation, and handoff."""

    def __init__(
        self,
        *,
        settings: Settings | None = None,
        registry: StudioRegistry | None = None,
        context_builder: ContextStackBuilder | None = None,
        lifecycle_manager: ArtifactLifecycleManager | None = None,
        sandbox_guard: StudioSandboxGuard | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.registry = registry or StudioRegistry()
        self.context_builder = context_builder or ContextStackBuilder(self.settings)
        self.lifecycle_manager = lifecycle_manager or ArtifactLifecycleManager(self.settings)
        self.sandbox_guard = sandbox_guard or StudioSandboxGuard()
        self.handoffs: list[StudioHandoffReceipt] = []
        self._bootstrapped = False

    async def bootstrap(self) -> None:
        if self._bootstrapped:
            return
        loader = StudioLoader(self.settings.studios_dir)
        for profile, instance in loader.discover_all():
            self.registry.register(profile, instance)
        await self.registry.initialize_runnable_studios()
        self._bootstrapped = True

    def list_studios(self) -> list[LoadedStudioProfile]:
        return self.registry.list_profiles()

    def get_studio_profile(self, studio_id: str) -> LoadedStudioProfile | None:
        return self.registry.get_profile(studio_id)

    async def build_context(
        self,
        studio_id: str,
        req: ContextBuildRequest,
    ) -> ContextStackResponse:
        profile = self.registry.get_profile(studio_id)
        if profile is None:
            raise KeyError(f"Studio '{studio_id}' not found.")

        terminal_stack, studio_stack = await self.context_builder.build(
            profile=profile,
            project_id=req.project_id,
            objective=req.objective,
            artifact_ids=req.artifact_ids,
            extra_constraints=req.constraints,
        )
        return ContextStackResponse(
            studio_id=studio_id,
            terminal_context_stack=terminal_stack,
            local_memory_count=len(studio_stack.local_memory),
            hydrated_artifact_count=len(studio_stack.context_artifacts),
        )

    async def _try_provider_enrichment(
        self,
        *,
        studio_id: str,
        project_id: str,
        objective: str,
        terminal_stack: TerminalContextStack,
        preferred_provider: str | None,
    ) -> dict[str, Any] | None:
        if not preferred_provider:
            return None
        try:
            async with httpx.AsyncClient(timeout=2.5) as client:
                route_resp = await client.post(
                    f"{self.settings.provider_service_url}/api/v1/providers/route",
                    json={
                        "requiredCapabilities": [ModelCapability.REASONING.value, ModelCapability.CODING.value],
                        "preferredProvider": preferred_provider,
                        "projectId": project_id,
                        "studioId": studio_id,
                        "allowLocalFallback": True,
                    },
                )
                if route_resp.status_code != 200:
                    return None
                decision = route_resp.json()
                gen_resp = await client.post(
                    f"{self.settings.provider_service_url}/api/v1/providers/generate",
                    json={
                        "provider": decision.get("provider", preferred_provider),
                        "model": decision.get("model"),
                        "mode": TerminalMode.STUDIO.value,
                        "prompt": objective,
                        "projectId": project_id,
                        "studioId": studio_id,
                        "contextStack": terminal_stack.model_dump(by_alias=True, exclude_none=True),
                    },
                )
                if gen_resp.status_code == 200:
                    return gen_resp.json()
        except Exception as exc:
            logger.debug("provider-service enrichment skipped for studio '%s': %s", studio_id, exc)
        return None

    async def execute_studio(
        self,
        *,
        studio_id: str,
        payload: StudioExecuteRequest,
        actor_id: str,
    ) -> WorkResponse:
        profile = self.registry.get_profile(studio_id)
        if profile is None:
            raise KeyError(f"Studio '{studio_id}' not found.")

        instance = self.registry.get_instance(studio_id)
        if instance is None:
            raise NotImplementedError(
                f"Studio '{studio_id}' manifest is registered, but runtime implementation is not enabled yet."
            )

        work_request = payload.work_request
        self.sandbox_guard.validate_request(studio_id, work_request)

        context_ids = list(work_request.context_artifacts)
        extra_constraints = list(work_request.constraints)
        if payload.context:
            for aid in payload.context.artifact_ids:
                if aid not in context_ids:
                    context_ids.append(aid)
            extra_constraints.extend(payload.context.constraints)

        terminal_stack, studio_stack = await self.context_builder.build(
            profile=profile,
            project_id=work_request.project_id,
            objective=work_request.objective,
            artifact_ids=context_ids,
            extra_constraints=extra_constraints,
        )

        bind_fn = getattr(instance, "bind_context_stack", None)
        if callable(bind_fn):
            bind_fn(studio_stack)

        await self._try_provider_enrichment(
            studio_id=studio_id,
            project_id=work_request.project_id,
            objective=work_request.objective,
            terminal_stack=terminal_stack,
            preferred_provider=payload.preferred_provider,
        )

        await instance.initialize()
        response = await instance.execute(work_request)

        get_artifacts_fn = getattr(instance, "get_artifacts_with_content", None)
        if callable(get_artifacts_fn):
            emitted_pairs: list[tuple[Artifact, str]] = get_artifacts_fn()
            for artifact, content in emitted_pairs:
                await self.lifecycle_manager.register_artifact(
                    studio_id=studio_id,
                    artifact=artifact,
                    content=content,
                    actor_id=actor_id,
                )

        return response

    async def validate_artifact(
        self,
        *,
        studio_id: str,
        payload: StudioValidateRequest,
        actor_id: str,
    ) -> StudioValidateResponse:
        profile = self.registry.get_profile(studio_id)
        if profile is None:
            raise KeyError(f"Studio '{studio_id}' not found.")

        instance = self.registry.get_instance(studio_id)
        valid = False
        if instance is not None:
            valid = await instance.validate(payload.artifact_id)

        if not valid:
            record = self.lifecycle_manager.get_record(payload.artifact_id)
            if record is not None:
                valid = bool(record.artifact.checksum and len(record.artifact.checksum) == 64)

        if valid and self.lifecycle_manager.get_record(payload.artifact_id) is not None:
            rec = self.lifecycle_manager.get_record(payload.artifact_id)
            if rec and rec.current_stage in (ArtifactStatus.DRAFT, ArtifactStatus.REVIEW):
                self.lifecycle_manager.transition(
                    artifact_id=payload.artifact_id,
                    target_status=ArtifactStatus.APPROVED,
                    actor_id=actor_id,
                    reason=f"Passed {studio_id} studio validation gate",
                )

        return StudioValidateResponse(
            studio_id=studio_id,
            artifact_id=payload.artifact_id,
            valid=valid,
            criteria_checked=list(payload.criteria),
        )

    async def summarize_artifacts(
        self,
        *,
        studio_id: str,
        payload: StudioSummarizeRequest,
    ) -> StudioSummarizeResponse:
        profile = self.registry.get_profile(studio_id)
        if profile is None:
            raise KeyError(f"Studio '{studio_id}' not found.")

        records = [
            rec
            for rec in self.lifecycle_manager.list_by_studio(studio_id)
            if rec.artifact.project_id == payload.project_id
            and (not payload.artifact_ids or rec.artifact.id in payload.artifact_ids)
        ]

        if records:
            titles = ", ".join(f"{r.artifact.title} [{r.current_stage.value}]" for r in records)
            summary = f"{profile.manifest.name} produced {len(records)} artifact(s) for project {payload.project_id}: {titles}."
            ids = [r.artifact.id for r in records]
        else:
            ids = list(payload.artifact_ids)
            summary = (
                f"{profile.manifest.name} summary for project {payload.project_id}: "
                f"{len(ids)} referenced artifact(s)."
            )

        return StudioSummarizeResponse(
            studio_id=studio_id,
            project_id=payload.project_id,
            artifact_ids=ids,
            summary=summary,
        )

    async def handoff_studio(
        self,
        *,
        studio_id: str,
        payload: StudioHandoffRequest,
        actor_id: str,
    ) -> StudioHandoffReceipt:
        profile = self.registry.get_profile(studio_id)
        if profile is None:
            raise KeyError(f"Studio '{studio_id}' not found.")

        if payload.from_studio_id != studio_id:
            raise ValueError(
                f"Handoff fromStudioId '{payload.from_studio_id}' does not match '{studio_id}'."
            )

        if not payload.artifact_ids:
            raise ValueError("Handoff requires at least one validated artifactId.")

        for aid in payload.artifact_ids:
            rec = self.lifecycle_manager.get_record(aid)
            if rec is not None and rec.current_stage == ArtifactStatus.APPROVED:
                self.lifecycle_manager.transition(
                    artifact_id=aid,
                    target_status=ArtifactStatus.INDEXED,
                    actor_id=actor_id,
                    reason=f"Handed off from {studio_id} to {payload.to_studio_id} via Jarvis",
                )

        now = datetime.now(timezone.utc)
        seed = f"{payload.project_id}:{studio_id}:{payload.to_studio_id}:{','.join(payload.artifact_ids)}"
        handoff_id = f"ho-{hashlib.sha256(seed.encode('utf-8')).hexdigest()[:12]}"
        receipt = StudioHandoffReceipt(
            handoff_id=handoff_id,
            project_id=payload.project_id,
            from_studio_id=studio_id,
            to_studio_id=payload.to_studio_id,
            artifact_ids=list(payload.artifact_ids),
            summary=payload.summary,
            routed_via="jarvis-agent-mesh",
            recorded_at=now,
        )
        self.handoffs.append(receipt)
        return receipt

    def list_studio_artifacts(self, studio_id: str) -> list[ArtifactLifecycleRecord]:
        if self.registry.get_profile(studio_id) is None:
            raise KeyError(f"Studio '{studio_id}' not found.")
        return self.lifecycle_manager.list_by_studio(studio_id)

    def transition_artifact_stage(
        self,
        *,
        studio_id: str,
        artifact_id: str,
        target_status: ArtifactStatus,
        actor_id: str,
        reason: str | None = None,
    ) -> ArtifactLifecycleRecord:
        if self.registry.get_profile(studio_id) is None:
            raise KeyError(f"Studio '{studio_id}' not found.")
        return self.lifecycle_manager.transition(
            artifact_id=artifact_id,
            target_status=target_status,
            actor_id=actor_id,
            reason=reason,
        )
