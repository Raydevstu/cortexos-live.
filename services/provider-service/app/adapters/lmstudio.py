from __future__ import annotations

import httpx

from cortexos_providers import ProviderAdapterRequest
from cortexos_types import ModelDescriptor, ProviderCapability
from cortexos_types.enums import ProviderId, ProviderType

from .base import BaseHttpProviderAdapter, estimate_token_count


class LMStudioAdapter(BaseHttpProviderAdapter):
    def __init__(self, *, base_url: str, allow_local_simulation: bool = True) -> None:
        super().__init__(
            provider_id=ProviderId.LMSTUDIO,
            display_name="LM Studio Local",
            provider_type=ProviderType.LOCAL,
            endpoint=base_url,
            api_key=None,
            allow_local_simulation=allow_local_simulation,
            models=[
                ModelDescriptor(
                    provider="lmstudio",
                    model="lmstudio-local/qwen2.5-7b-instruct",
                    display_name="LM Studio Local Qwen 2.5",
                    capabilities=ProviderCapability(
                        chat=True, reasoning=True, coding=True, tools=False, files=True, vision=False, agent=False
                    ),
                    context_window=32768,
                    cost_input=0.0,
                    cost_output=0.0,
                    available=True,
                ),
            ],
        )

    async def _invoke_remote(self, request: ProviderAdapterRequest) -> tuple[str, int, int]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(
                f"{self.endpoint}/chat/completions",
                json={
                    "model": request.model,
                    "messages": [{"role": "user", "content": request.prompt}],
                    "temperature": request.temperature,
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
