from __future__ import annotations

import httpx

from cortexos_providers import ProviderAdapterRequest
from cortexos_types import ModelDescriptor, ProviderCapability
from cortexos_types.enums import ProviderId, ProviderType

from .base import BaseHttpProviderAdapter, estimate_token_count


class GrokAdapter(BaseHttpProviderAdapter):
    def __init__(self, *, api_key: str | None, base_url: str, allow_local_simulation: bool = True) -> None:
        super().__init__(
            provider_id=ProviderId.GROK,
            display_name="xAI Grok",
            provider_type=ProviderType.CLOUD,
            endpoint=base_url,
            api_key=api_key,
            allow_local_simulation=allow_local_simulation,
            models=[
                ModelDescriptor(
                    provider="grok",
                    model="grok-3",
                    display_name="Grok 3",
                    capabilities=ProviderCapability(
                        chat=True, reasoning=True, coding=True, tools=True, files=False, vision=True, agent=True
                    ),
                    context_window=131072,
                    cost_input=0.003,
                    cost_output=0.015,
                    available=True,
                ),
            ],
        )

    async def _invoke_remote(self, request: ProviderAdapterRequest) -> tuple[str, int, int]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(
                f"{self.endpoint}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": request.model,
                    "messages": [{"role": "user", "content": request.prompt}],
                    "temperature": request.temperature,
                    "max_tokens": request.max_tokens,
                },
            )
            res.raise_for_status()
            data = res.json()
            text = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            return (
                text,
                int(usage.get("prompt_tokens", estimate_token_count(request.prompt))),
                int(usage.get("completion_tokens", estimate_token_count(text))),
            )
