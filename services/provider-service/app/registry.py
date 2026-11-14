from __future__ import annotations

import time
from datetime import datetime, timezone

from cortexos_types import (
    ModelDescriptor,
    Provider,
    ProviderHealthStatus,
)
from cortexos_types.enums import ProviderId

from app.adapters import (
    AnthropicAdapter,
    AzureOpenAIAdapter,
    BaseHttpProviderAdapter,
    DeepSeekAdapter,
    GeminiAdapter,
    GrokAdapter,
    LMStudioAdapter,
    OllamaAdapter,
    OpenAIAdapter,
    OpenRouterAdapter,
)
from app.core.config import Settings, get_settings


DEFAULT_PROVIDER_ORDER: tuple[str, ...] = (
    ProviderId.OPENAI.value,
    ProviderId.ANTHROPIC.value,
    ProviderId.GEMINI.value,
    ProviderId.DEEPSEEK.value,
    ProviderId.GROK.value,
    ProviderId.OPENROUTER.value,
    ProviderId.AZURE_OPENAI.value,
    ProviderId.OLLAMA.value,
    ProviderId.LMSTUDIO.value,
)


class ProviderRegistry:
    """Maintains all registered ProviderAdapters, ModelDescriptors, and live Health Monitoring."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._adapters: dict[str, BaseHttpProviderAdapter] = {}
        self._health: dict[str, ProviderHealthStatus] = {}
        self._failure_counts: dict[str, int] = {}
        self._register_defaults()

    def _register_defaults(self) -> None:
        s = self.settings
        adapters: list[BaseHttpProviderAdapter] = [
            OpenAIAdapter(
                api_key=s.openai_api_key,
                base_url=s.openai_base_url,
                allow_local_simulation=s.allow_local_simulation,
            ),
            AnthropicAdapter(
                api_key=s.anthropic_api_key,
                base_url=s.anthropic_base_url,
                allow_local_simulation=s.allow_local_simulation,
            ),
            GeminiAdapter(
                api_key=s.gemini_api_key,
                base_url=s.gemini_base_url,
                allow_local_simulation=s.allow_local_simulation,
            ),
            GrokAdapter(
                api_key=s.grok_api_key,
                base_url=s.grok_base_url,
                allow_local_simulation=s.allow_local_simulation,
            ),
            DeepSeekAdapter(
                api_key=s.deepseek_api_key,
                base_url=s.deepseek_base_url,
                allow_local_simulation=s.allow_local_simulation,
            ),
            OpenRouterAdapter(
                api_key=s.openrouter_api_key,
                base_url=s.openrouter_base_url,
                allow_local_simulation=s.allow_local_simulation,
            ),
            OllamaAdapter(
                base_url=s.ollama_base_url,
                allow_local_simulation=s.allow_local_simulation,
            ),
            LMStudioAdapter(
                base_url=s.lmstudio_base_url,
                allow_local_simulation=s.allow_local_simulation,
            ),
            AzureOpenAIAdapter(
                api_key=s.azure_openai_api_key,
                endpoint=s.azure_openai_endpoint,
                allow_local_simulation=s.allow_local_simulation,
            ),
        ]
        now = datetime.now(timezone.utc)
        for adapter in adapters:
            pid = adapter.provider_id.value
            self._adapters[pid] = adapter
            self._failure_counts[pid] = 0
            self._health[pid] = ProviderHealthStatus(
                provider=pid,
                healthy=True,
                latency_ms=1.5,
                last_checked_at=now,
                error=None,
            )

    def get_adapter(self, provider_id: str) -> BaseHttpProviderAdapter | None:
        return self._adapters.get(provider_id)

    def ordered_provider_ids(self) -> list[str]:
        known = [p for p in DEFAULT_PROVIDER_ORDER if p in self._adapters]
        extra = [p for p in self._adapters if p not in known]
        return [*known, *extra]

    async def list_providers(self) -> list[Provider]:
        now = datetime.now(timezone.utc)
        items: list[Provider] = []
        for pid in self.ordered_provider_ids():
            adapter = self._adapters[pid]
            models = await adapter.list_models()
            health = self._health.get(pid)
            items.append(
                Provider(
                    id=f"prov-{pid}",
                    provider_id=adapter.provider_id,
                    name=adapter.display_name,
                    type=adapter.provider_type,
                    healthy=health.healthy if health else True,
                    endpoint=adapter.endpoint,
                    models_count=len(models),
                    created_at=now,
                    updated_at=now,
                )
            )
        return items

    async def list_models(self, provider_id: str | None = None) -> list[ModelDescriptor]:
        if provider_id is not None:
            adapter = self._adapters.get(provider_id)
            return await adapter.list_models() if adapter else []
        all_models: list[ModelDescriptor] = []
        for pid in self.ordered_provider_ids():
            all_models.extend(await self._adapters[pid].list_models())
        return all_models

    async def find_model(self, provider_id: str, model_name: str) -> ModelDescriptor | None:
        for model in await self.list_models(provider_id):
            if model.model == model_name:
                return model
        return None

    async def check_provider_health(self, provider_id: str) -> ProviderHealthStatus | None:
        adapter = self._adapters.get(provider_id)
        if adapter is None:
            return None
        started = time.perf_counter()
        err: str | None = None
        try:
            ok = await adapter.health_check()
            if not ok:
                err = adapter._simulated_failure or "Health probe returned unhealthy"
        except Exception as exc:
            ok = False
            err = str(exc)
        latency = round((time.perf_counter() - started) * 1000.0, 2)
        status = ProviderHealthStatus(
            provider=provider_id,
            healthy=ok,
            latency_ms=latency,
            last_checked_at=datetime.now(timezone.utc),
            error=err,
        )
        self._health[provider_id] = status
        if ok:
            self._failure_counts[provider_id] = 0
        return status

    async def check_all_health(self, *, refresh: bool = False) -> list[ProviderHealthStatus]:
        if refresh:
            for pid in self.ordered_provider_ids():
                await self.check_provider_health(pid)
        return [self._health[pid] for pid in self.ordered_provider_ids()]

    def is_healthy(self, provider_id: str) -> bool:
        status = self._health.get(provider_id)
        return bool(status and status.healthy)

    def record_success(self, provider_id: str, latency_ms: float) -> None:
        self._failure_counts[provider_id] = 0
        self._health[provider_id] = ProviderHealthStatus(
            provider=provider_id,
            healthy=True,
            latency_ms=latency_ms,
            last_checked_at=datetime.now(timezone.utc),
            error=None,
        )

    def record_failure(self, provider_id: str, error: str) -> None:
        count = self._failure_counts.get(provider_id, 0) + 1
        self._failure_counts[provider_id] = count
        self._health[provider_id] = ProviderHealthStatus(
            provider=provider_id,
            healthy=False if count >= 1 else True,
            latency_ms=None,
            last_checked_at=datetime.now(timezone.utc),
            error=error,
        )
