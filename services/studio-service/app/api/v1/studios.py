from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, status

from cortexos_types import (
    StudioExecuteRequest,
    StudioHandoffRequest,
    StudioManifest,
    StudioSummarizeRequest,
    StudioValidateRequest,
    WorkResponse,
)

from app.core.security import RequestContext, require_permission
from app.runtime import StudioRuntime
from app.schemas import (
    ArtifactLifecycleRecord,
    ArtifactTransitionRequest,
    ContextBuildRequest,
    ContextStackResponse,
    LoadedStudioProfile,
    StudioHandoffReceipt,
    StudioSummarizeResponse,
    StudioValidateResponse,
)

router = APIRouter(prefix="/studios", tags=["studios"])


@lru_cache
def get_studio_runtime() -> StudioRuntime:
    return StudioRuntime()


async def _ensure_bootstrapped(runtime: StudioRuntime) -> StudioRuntime:
    await runtime.bootstrap()
    return runtime


@router.get("", response_model=list[LoadedStudioProfile])
async def list_studios(
    _: RequestContext = Depends(require_permission("project", "read")),
    runtime: StudioRuntime = Depends(get_studio_runtime),
) -> list[LoadedStudioProfile]:
    await _ensure_bootstrapped(runtime)
    return runtime.list_studios()


@router.get("/{studio_id}", response_model=LoadedStudioProfile)
async def get_studio(
    studio_id: str,
    _: RequestContext = Depends(require_permission("project", "read")),
    runtime: StudioRuntime = Depends(get_studio_runtime),
) -> LoadedStudioProfile:
    await _ensure_bootstrapped(runtime)
    profile = runtime.get_studio_profile(studio_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Studio '{studio_id}' not found",
        )
    return profile


@router.get("/{studio_id}/manifest", response_model=StudioManifest)
async def get_studio_manifest(
    studio_id: str,
    _: RequestContext = Depends(require_permission("project", "read")),
    runtime: StudioRuntime = Depends(get_studio_runtime),
) -> StudioManifest:
    await _ensure_bootstrapped(runtime)
    profile = runtime.get_studio_profile(studio_id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Studio '{studio_id}' not found",
        )
    return profile.manifest


@router.post("/{studio_id}/context", response_model=ContextStackResponse)
async def build_studio_context(
    studio_id: str,
    payload: ContextBuildRequest,
    _: RequestContext = Depends(require_permission("studio", "execute")),
    runtime: StudioRuntime = Depends(get_studio_runtime),
) -> ContextStackResponse:
    await _ensure_bootstrapped(runtime)
    try:
        return await runtime.build_context(studio_id, payload)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.post("/{studio_id}/execute", response_model=WorkResponse)
async def execute_studio(
    studio_id: str,
    payload: StudioExecuteRequest,
    ctx: RequestContext = Depends(require_permission("studio", "execute")),
    runtime: StudioRuntime = Depends(get_studio_runtime),
) -> WorkResponse:
    await _ensure_bootstrapped(runtime)
    try:
        return await runtime.execute_studio(
            studio_id=studio_id,
            payload=payload,
            actor_id=ctx.subject_id,
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except NotImplementedError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


@router.post("/{studio_id}/validate", response_model=StudioValidateResponse)
async def validate_studio_artifact(
    studio_id: str,
    payload: StudioValidateRequest,
    ctx: RequestContext = Depends(require_permission("studio", "execute")),
    runtime: StudioRuntime = Depends(get_studio_runtime),
) -> StudioValidateResponse:
    await _ensure_bootstrapped(runtime)
    try:
        return await runtime.validate_artifact(
            studio_id=studio_id,
            payload=payload,
            actor_id=ctx.subject_id,
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.post("/{studio_id}/summarize", response_model=StudioSummarizeResponse)
async def summarize_studio_artifacts(
    studio_id: str,
    payload: StudioSummarizeRequest,
    _: RequestContext = Depends(require_permission("artifact", "read")),
    runtime: StudioRuntime = Depends(get_studio_runtime),
) -> StudioSummarizeResponse:
    await _ensure_bootstrapped(runtime)
    try:
        return await runtime.summarize_artifacts(
            studio_id=studio_id,
            payload=payload,
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.post("/{studio_id}/handoff", response_model=StudioHandoffReceipt)
async def handoff_studio(
    studio_id: str,
    payload: StudioHandoffRequest,
    ctx: RequestContext = Depends(require_permission("studio", "execute")),
    runtime: StudioRuntime = Depends(get_studio_runtime),
) -> StudioHandoffReceipt:
    await _ensure_bootstrapped(runtime)
    try:
        return await runtime.handoff_studio(
            studio_id=studio_id,
            payload=payload,
            actor_id=ctx.subject_id,
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


@router.get("/{studio_id}/artifacts", response_model=list[ArtifactLifecycleRecord])
async def list_studio_artifacts(
    studio_id: str,
    _: RequestContext = Depends(require_permission("artifact", "read")),
    runtime: StudioRuntime = Depends(get_studio_runtime),
) -> list[ArtifactLifecycleRecord]:
    await _ensure_bootstrapped(runtime)
    try:
        return runtime.list_studio_artifacts(studio_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.post(
    "/{studio_id}/artifacts/{artifact_id}/transition",
    response_model=ArtifactLifecycleRecord,
)
async def transition_studio_artifact(
    studio_id: str,
    artifact_id: str,
    payload: ArtifactTransitionRequest,
    ctx: RequestContext = Depends(require_permission("artifact", "write")),
    runtime: StudioRuntime = Depends(get_studio_runtime),
) -> ArtifactLifecycleRecord:
    await _ensure_bootstrapped(runtime)
    try:
        return runtime.transition_artifact_stage(
            studio_id=studio_id,
            artifact_id=artifact_id,
            target_status=payload.target_status,
            actor_id=ctx.subject_id,
            reason=payload.reason,
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
