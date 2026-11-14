from __future__ import annotations

import httpx

from cortexos_providers import ProviderAdapterRequest
from cortexos_types import ModelDescriptor, ProviderCapability
from cortexos_types.enums import ProviderId, ProviderType

from .base import BaseHttpProviderAdapter, estimate_token_count


class AzureOpenAIAdapter(BaseHttpProviderAdapter):
    def __init__(self, *, api_key: str | None, endpoint: str | None, allow_local_simulation: bool = True) -> None:
        super().__init__(
            provider_id=ProviderId.AZURE_OPENAI,
            display_name="Azure OpenAI",
            provider_type=ProviderType.ENTERPRISE,
            endpoint=endpoint or "https://azure-openai.example.com",
            api_key=api_key,
            allow_local_simulation=allow_local_simulation,
            models=[
                ModelDescriptor(
                    provider="azure_openai",
                    model="gpt-4o-enterprise",
                    display_name="Azure GPT-4o Enterprise",
                    capabilities=ProviderCapability(
                        chat=True, reasoning=True, coding=True, tools=True, files=True, vision=True, agent=True
                    ),
                    context_window=128000,
                    cost_input=0.005,
                    cost_output=0.015,
                    available=bool(api_key and endpoint) or allow_local_simulation,
                ),
            ],
        )

    async def _invoke_remote(self, request: ProviderAdapterRequest) -> tuple[str, int, int]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(
                f"{self.endpoint}/openai/deployments/{request.model}/chat/completions?api-version=2024-08-01-preview",
                headers={"api-key": str(self.api_key)},
                json={"messages": [{"role": "user", "content": request.prompt}]},
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
