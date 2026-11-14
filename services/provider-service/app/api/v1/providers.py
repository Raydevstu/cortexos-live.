from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, Query, status

from cortexos_types import (
    ModelDescriptor,
    ModelRoutingDecision,
    ModelRoutingRequest,
    Provider,
    ProviderGenerateRequest,
    ProviderGenerateResponse,
    ProviderHealthStatus,
)

from app.core.security import RequestContext, require_permission
from app.costs import UsageTotals, UsageTracker
from app.failover import FailoverExecutor
from app.registry import ProviderRegistry
from app.router import CapabilityRouter
from app.schemas import EmbedRequest, EmbedResponse, SimulateProviderFailureRequest

router = APIRouter(prefix="/providers", tags=["providers"])


@lru_cache
def get_provider_registry() -> ProviderRegistry:
    return ProviderRegistry()


@lru_cache
def get_usage_tracker() -> UsageTracker:
    return UsageTracker()


@lru_cache
def get_capability_router() -> CapabilityRouter:
    return CapabilityRouter(get_provider_registry())


@lru_cache
def get_failover_executor() -> FailoverExecutor:
    return FailoverExecutor(
        registry=get_provider_registry(),
        router=get_capability_router(),
        usage_tracker=get_usage_tracker(),
    )


@router.get("", response_model=list[Provider])
async def list_providers(
    _: RequestContext = Depends(require_permission("providers", "read")),
    registry: ProviderRegistry = Depends(get_provider_registry),
) -> list[Provider]:
    return await registry.list_providers()


@router.get("/health", response_model=list[ProviderHealthStatus])
async def list_provider_health(
    refresh: bool = Query(default=False),
    _: RequestContext = Depends(require_permission("providers", "read")),
    registry: ProviderRegistry = Depends(get_provider_registry),
) -> list[ProviderHealthStatus]:
    return await registry.check_all_health(refresh=refresh)


@router.post("/{provider}/health", response_model=ProviderHealthStatus)
async def probe_or_simulate_provider_health(
    provider: str,
    payload: SimulateProviderFailureRequest | None = None,
    _: RequestContext = Depends(require_permission("providers", "manage")),
    registry: ProviderRegistry = Depends(get_provider_registry),
) -> ProviderHealthStatus:
    adapter = registry.get_adapter(provider)
    if adapter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Provider '{provider}' not registered",
        )
    if payload is not None:
        adapter.set_simulated_failure(payload.reason)
    result = await registry.check_provider_health(provider)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Provider '{provider}' not registered",
        )
    return result


@router.get("/models", response_model=list[ModelDescriptor])
async def list_all_models(
    _: RequestContext = Depends(require_permission("providers", "read")),
    registry: ProviderRegistry = Depends(get_provider_registry),
) -> list[ModelDescriptor]:
    return await registry.list_models()


@router.get("/{provider}/models", response_model=list[ModelDescriptor])
async def list_provider_models(
    provider: str,
    _: RequestContext = Depends(require_permission("providers", "read")),
    registry: ProviderRegistry = Depends(get_provider_registry),
) -> list[ModelDescriptor]:
    if registry.get_adapter(provider) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Provider '{provider}' not registered",
        )
    return await registry.list_models(provider)


@router.post("/route", response_model=ModelRoutingDecision)
async def route_model(
    payload: ModelRoutingRequest,
    _: RequestContext = Depends(require_permission("providers", "read")),
    capability_router: CapabilityRouter = Depends(get_capability_router),
) -> ModelRoutingDecision:
    try:
        return await capability_router.route(payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


@router.post("/generate", response_model=ProviderGenerateResponse)
async def generate_completion(
    payload: ProviderGenerateRequest,
    _: RequestContext = Depends(require_permission("terminal", "execute")),
    executor: FailoverExecutor = Depends(get_failover_executor),
) -> ProviderGenerateResponse:
    try:
        return await executor.generate_with_failover(payload)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.post("/embed", response_model=EmbedResponse)
async def generate_embeddings(
    payload: EmbedRequest,
    _: RequestContext = Depends(require_permission("terminal", "execute")),
    executor: FailoverExecutor = Depends(get_failover_executor),
) -> EmbedResponse:
    try:
        provider, vectors = await executor.embed_with_failover(
            texts=payload.texts,
            preferred_provider=payload.preferred_provider,
        )
        return EmbedResponse(
            provider=provider,
            dimensions=len(vectors[0]) if vectors else 0,
            embeddings=vectors,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc


@router.get("/usage", response_model=UsageTotals)
async def get_usage_summary(
    project_id: str | None = Query(default=None),
    studio_id: str | None = Query(default=None),
    provider: str | None = Query(default=None),
    _: RequestContext = Depends(require_permission("providers", "read")),
    tracker: UsageTracker = Depends(get_usage_tracker),
) -> UsageTotals:
    return tracker.summarize(
        project_id=project_id,
        studio_id=studio_id,
        provider=provider,
    )
