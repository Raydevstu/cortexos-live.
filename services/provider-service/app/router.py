from __future__ import annotations

from cortexos_types import (
    ModelDescriptor,
    ModelRoutingDecision,
    ModelRoutingRequest,
    ProviderCapability,
)
from cortexos_types.enums import ModelCapability, ProviderType

from app.registry import ProviderRegistry

CAPABILITY_FIELD_MAP: dict[ModelCapability, str] = {
    ModelCapability.CHAT: "chat",
    ModelCapability.REASONING: "reasoning",
    ModelCapability.CODING: "coding",
    ModelCapability.TOOLS: "tools",
    ModelCapability.FILES: "files",
    ModelCapability.VISION: "vision",
    ModelCapability.AUDIO: "audio",
    ModelCapability.AGENT_TASKS: "agent",
}


def model_satisfies_capabilities(
    capabilities: ProviderCapability,
    required: list[ModelCapability],
) -> bool:
    for cap in required:
        field_name = CAPABILITY_FIELD_MAP.get(cap, cap.value)
        if not bool(getattr(capabilities, field_name, False)):
            return False
    return True


class CapabilityRouter:
    """Capability-first router selecting optimal model & ordered fallback chain."""

    def __init__(self, registry: ProviderRegistry) -> None:
        self.registry = registry

    async def route(self, request: ModelRoutingRequest) -> ModelRoutingDecision:
        candidates: list[tuple[tuple[int, int, float, int], ModelDescriptor]] = []
        provider_order = self.registry.ordered_provider_ids()
        order_index = {pid: idx for idx, pid in enumerate(provider_order)}

        for model in await self.registry.list_models():
            if not model.available:
                continue
            adapter = self.registry.get_adapter(model.provider)
            if adapter is None:
                continue
            if not self.registry.is_healthy(model.provider):
                continue
            if (
                not request.allow_local_fallback
                and adapter.provider_type == ProviderType.LOCAL
            ):
                continue
            if (
                request.max_cost_input is not None
                and model.cost_input > request.max_cost_input
            ):
                continue
            if not model_satisfies_capabilities(
                model.capabilities, request.required_capabilities
            ):
                continue

            is_preferred = 0 if model.provider == request.preferred_provider else 1
            tier_rank = (
                0
                if adapter.provider_type == ProviderType.CLOUD
                else (1 if adapter.provider_type == ProviderType.ENTERPRISE else 2)
            )
            sort_key = (
                is_preferred,
                tier_rank,
                float(model.cost_input),
                order_index.get(model.provider, 999),
            )
            candidates.append((sort_key, model))

        if not candidates:
            raise ValueError(
                f"No healthy model satisfies required capabilities: "
                f"{[c.value for c in request.required_capabilities]}"
            )

        candidates.sort(key=lambda item: item[0])
        selected = candidates[0][1]

        fallback_chain: list[str] = []
        seen_providers: set[str] = {selected.provider}
        for _, cand in candidates[1:]:
            if cand.provider not in seen_providers:
                seen_providers.add(cand.provider)
                fallback_chain.append(f"{cand.provider}:{cand.model}")

        caps_label = ", ".join(c.value for c in request.required_capabilities) or "general"
        reason = (
            f"Selected preferred provider '{selected.provider}' for [{caps_label}]"
            if request.preferred_provider == selected.provider
            else f"Selected healthiest capability-matched model '{selected.provider}:{selected.model}' for [{caps_label}]"
        )
        return ModelRoutingDecision(
            provider=selected.provider,
            model=selected.model,
            reason=reason,
            fallback_chain=fallback_chain,
            estimated_cost_input=selected.cost_input,
            estimated_cost_output=selected.cost_output,
        )
