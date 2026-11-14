from __future__ import annotations

import httpx

from cortexos_providers import ProviderAdapterRequest
from cortexos_types import ModelDescriptor, ProviderCapability
from cortexos_types.enums import ProviderId, ProviderType

from .base import BaseHttpProviderAdapter, estimate_token_count


class AnthropicAdapter(BaseHttpProviderAdapter):
    def __init__(self, *, api_key: str | None, base_url: str, allow_local_simulation: bool = True) -> None:
        super().__init__(
            provider_id=ProviderId.ANTHROPIC,
            display_name="Anthropic",
            provider_type=ProviderType.CLOUD,
            endpoint=base_url,
            api_key=api_key,
            allow_local_simulation=allow_local_simulation,
            models=[
                ModelDescriptor(
                    provider="anthropic",
                    model="claude-sonnet-4-5",
                    display_name="Claude Sonnet 4.5",
                    capabilities=ProviderCapability(
                        chat=True, reasoning=True, coding=True, tools=True, files=True, vision=True, agent=True
                    ),
                    context_window=200000,
                    cost_input=0.003,
                    cost_output=0.015,
                    available=True,
                ),
                ModelDescriptor(
                    provider="anthropic",
                    model="claude-haiku-4-5",
                    display_name="Claude Haiku 4.5",
                    capabilities=ProviderCapability(
                        chat=True, reasoning=True, coding=True, tools=True, files=True, vision=True, agent=False
                    ),
                    context_window=200000,
                    cost_input=0.0008,
                    cost_output=0.004,
                    available=True,
                ),
            ],
        )

    async def _invoke_remote(self, request: ProviderAdapterRequest) -> tuple[str, int, int]:
        payload: dict[str, object] = {
            "model": request.model,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "messages": [{"role": "user", "content": request.prompt}],
        }
        if request.system_prompt:
            payload["system"] = request.system_prompt
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(
                f"{self.endpoint}/messages",
                headers={
                    "x-api-key": str(self.api_key),
                    "anthropic-version": "2023-06-01",
                },
                json=payload,
            )
            res.raise_for_status()
            data = res.json()
            text = "".join(
                block.get("text", "")
                for block in data.get("content", [])
                if block.get("type") == "text"
            )
            usage = data.get("usage", {})
            return (
                text,
                int(usage.get("input_tokens", estimate_token_count(request.prompt))),
                int(usage.get("output_tokens", estimate_token_count(text))),
            )
