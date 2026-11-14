from __future__ import annotations

import logging
import uuid

from cortexos_providers import ProviderAdapterRequest
from cortexos_types import (
    ModelRoutingRequest,
    ProviderGenerateRequest,
    ProviderGenerateResponse,
    ProviderUsageSummary,
    TerminalContextStack,
)

from app.costs import UsageTracker
from app.registry import ProviderRegistry
from app.router import CapabilityRouter

logger = logging.getLogger(__name__)


def render_context_prompt(
    prompt: str, context_stack: TerminalContextStack | None
) -> tuple[str | None, str]:
    if context_stack is None:
        return None, prompt
    sections: list[str] = []
    if context_stack.studio_context:
        sections.append(f"[Studio Context]\n{context_stack.studio_context}")
    if context_stack.project_context:
        sections.append(f"[Project Context]\n{context_stack.project_context}")
    if context_stack.knowledge_context:
        sections.append(
            "[Knowledge Context]\n" + "\n".join(context_stack.knowledge_context)
        )
    if context_stack.memory_context:
        sections.append("[Memory Context]\n" + "\n".join(context_stack.memory_context))
    if context_stack.artifact_context:
        sections.append(
            "[Artifact Context]\n" + "\n".join(context_stack.artifact_context)
        )
    system_prompt = "\n\n".join(sections) if sections else None
    user_prompt = context_stack.user_prompt or prompt
    return system_prompt, user_prompt


class FailoverExecutor:
    """Executes model generation & embeddings across automatic primary->fallback chains."""

    def __init__(
        self,
        *,
        registry: ProviderRegistry,
        router: CapabilityRouter,
        usage_tracker: UsageTracker,
    ) -> None:
        self.registry = registry
        self.router = router
        self.usage_tracker = usage_tracker

    async def generate_with_failover(
        self, request: ProviderGenerateRequest
    ) -> ProviderGenerateResponse:
        request_id = f"gen-{uuid.uuid4().hex[:12]}"
        routing_decision = await self.router.route(
            ModelRoutingRequest(
                required_capabilities=request.required_capabilities,
                preferred_provider=request.provider,
                project_id=request.project_id,
                studio_id=request.studio_id,
                allow_local_fallback=True,
            )
        )

        # Build ordered candidate list: (explicit provider:model if requested) -> routed -> fallbacks
        attempts: list[tuple[str, str]] = []
        if request.provider and request.model:
            attempts.append((request.provider, request.model))
        primary_pair = (routing_decision.provider, routing_decision.model)
        if primary_pair not in attempts:
            attempts.append(primary_pair)
        for spec in routing_decision.fallback_chain:
            p, m = spec.split(":", 1)
            if (p, m) not in attempts:
                attempts.append((p, m))

        system_prompt, prompt_text = render_context_prompt(
            request.prompt, request.context_stack
        )
        errors: list[str] = []

        for provider_id, model_name in attempts:
            adapter = self.registry.get_adapter(provider_id)
            if adapter is None:
                continue
            try:
                adapter_req = ProviderAdapterRequest(
                    request_id=request_id,
                    model=model_name,
                    prompt=prompt_text,
                    mode=request.mode,
                    system_prompt=system_prompt,
                    tools=request.tools,
                    temperature=request.temperature if request.temperature is not None else 0.2,
                    max_tokens=request.max_tokens if request.max_tokens is not None else 2048,
                )
                result = await adapter.generate(adapter_req)
                self.registry.record_success(provider_id, result.latency_ms)

                descriptor = await self.registry.find_model(provider_id, model_name)
                usage_rec = self.usage_tracker.record(
                    project_id=request.project_id,
                    studio_id=request.studio_id,
                    provider=provider_id,
                    model_name=model_name,
                    model_descriptor=descriptor,
                    input_tokens=result.input_tokens,
                    output_tokens=result.output_tokens,
                    latency_ms=result.latency_ms,
                )

                return ProviderGenerateResponse(
                    request_id=request_id,
                    provider=provider_id,
                    model=model_name,
                    output=result.output,
                    tool_calls=result.tool_calls,
                    artifact_ids=[],
                    usage=ProviderUsageSummary(
                        input_tokens=usage_rec.input_tokens,
                        output_tokens=usage_rec.output_tokens,
                        cost_usd=usage_rec.cost_usd,
                    ),
                )
            except Exception as exc:
                logger.warning(
                    "Provider %s:%s failed (%s); attempting automatic failover",
                    provider_id,
                    model_name,
                    exc,
                )
                self.registry.record_failure(provider_id, str(exc))
                errors.append(f"{provider_id}:{model_name} -> {exc}")

        raise RuntimeError("All providers in failover chain failed: " + "; ".join(errors))

    async def embed_with_failover(
        self,
        *,
        texts: list[str],
        preferred_provider: str | None = None,
    ) -> tuple[str, list[list[float]]]:
        order = self.registry.ordered_provider_ids()
        if preferred_provider and preferred_provider in order:
            order = [preferred_provider, *[p for p in order if p != preferred_provider]]
        errors: list[str] = []
        for provider_id in order:
            if not self.registry.is_healthy(provider_id):
                continue
            adapter = self.registry.get_adapter(provider_id)
            if adapter is None:
                continue
            try:
                vectors = await adapter.embeddings(texts)
                self.registry.record_success(provider_id, 1.0)
                return provider_id, vectors
            except Exception as exc:
                self.registry.record_failure(provider_id, str(exc))
                errors.append(f"{provider_id}: {exc}")
        raise RuntimeError("All embedding providers failed: " + "; ".join(errors))
