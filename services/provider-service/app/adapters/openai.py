from __future__ import annotations

import httpx

from cortexos_providers import ProviderAdapterRequest
from cortexos_types import ModelDescriptor, ProviderCapability
from cortexos_types.enums import ProviderId, ProviderType

from .base import BaseHttpProviderAdapter, estimate_token_count


class OpenAIAdapter(BaseHttpProviderAdapter):
    def __init__(self, *, api_key: str | None, base_url: str, allow_local_simulation: bool = True) -> None:
        super().__init__(
            provider_id=ProviderId.OPENAI,
            display_name="OpenAI",
            provider_type=ProviderType.CLOUD,
            endpoint=base_url,
            api_key=api_key,
            allow_local_simulation=allow_local_simulation,
            models=[
                ModelDescriptor(
                    provider="openai",
                    model="gpt-5",
                    display_name="GPT-5",
                    capabilities=ProviderCapability(
                        chat=True, reasoning=True, coding=True, tools=True, files=True, vision=True, agent=True
                    ),
                    context_window=256000,
                    cost_input=0.005,
                    cost_output=0.015,
                    available=True,
                ),
                ModelDescriptor(
                    provider="openai",
                    model="gpt-5-mini",
                    display_name="GPT-5 Mini",
                    capabilities=ProviderCapability(
                        chat=True, reasoning=True, coding=True, tools=True, files=True, vision=True, agent=True
                    ),
                    context_window=128000,
                    cost_input=0.001,
                    cost_output=0.004,
                    available=True,
                ),
            ],
        )

    async def _invoke_remote(self, request: ProviderAdapterRequest) -> tuple[str, int, int]:
        messages = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        messages.append({"role": "user", "content": request.prompt})
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(
                f"{self.endpoint}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": request.model,
                    "messages": messages,
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
