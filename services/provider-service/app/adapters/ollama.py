from __future__ import annotations

import httpx

from cortexos_providers import ProviderAdapterRequest
from cortexos_types import ModelDescriptor, ProviderCapability
from cortexos_types.enums import ProviderId, ProviderType

from .base import BaseHttpProviderAdapter, estimate_token_count


class OllamaAdapter(BaseHttpProviderAdapter):
    def __init__(self, *, base_url: str, allow_local_simulation: bool = True) -> None:
        super().__init__(
            provider_id=ProviderId.OLLAMA,
            display_name="Ollama Local",
            provider_type=ProviderType.LOCAL,
            endpoint=base_url,
            api_key=None,
            allow_local_simulation=allow_local_simulation,
            models=[
                ModelDescriptor(
                    provider="ollama",
                    model="qwen2.5-coder:32b",
                    display_name="Qwen 2.5 Coder 32B (Local)",
                    capabilities=ProviderCapability(
                        chat=True, reasoning=True, coding=True, tools=True, files=True, vision=False, agent=True
                    ),
                    context_window=65536,
                    cost_input=0.0,
                    cost_output=0.0,
                    available=True,
                ),
            ],
        )

    async def _invoke_remote(self, request: ProviderAdapterRequest) -> tuple[str, int, int]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(
                f"{self.endpoint}/api/generate",
                json={
                    "model": request.model,
                    "prompt": request.prompt,
                    "system": request.system_prompt or "",
                    "stream": False,
                },
            )
            res.raise_for_status()
            data = res.json()
            text = str(data.get("response", ""))
            return (
                text,
                int(data.get("prompt_eval_count", estimate_token_count(request.prompt))),
                int(data.get("eval_count", estimate_token_count(text))),
            )
