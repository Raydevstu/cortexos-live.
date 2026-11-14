from __future__ import annotations

import httpx

from cortexos_providers import ProviderAdapterRequest
from cortexos_types import ModelDescriptor, ProviderCapability
from cortexos_types.enums import ProviderId, ProviderType

from .base import BaseHttpProviderAdapter, estimate_token_count


class GeminiAdapter(BaseHttpProviderAdapter):
    def __init__(self, *, api_key: str | None, base_url: str, allow_local_simulation: bool = True) -> None:
        super().__init__(
            provider_id=ProviderId.GEMINI,
            display_name="Google Gemini",
            provider_type=ProviderType.CLOUD,
            endpoint=base_url,
            api_key=api_key,
            allow_local_simulation=allow_local_simulation,
            models=[
                ModelDescriptor(
                    provider="gemini",
                    model="gemini-2.5-pro",
                    display_name="Gemini 2.5 Pro",
                    capabilities=ProviderCapability(
                        chat=True, reasoning=True, coding=True, tools=True, files=True, vision=True, audio=True, agent=True
                    ),
                    context_window=1000000,
                    cost_input=0.0025,
                    cost_output=0.01,
                    available=True,
                ),
                ModelDescriptor(
                    provider="gemini",
                    model="gemini-2.5-flash",
                    display_name="Gemini 2.5 Flash",
                    capabilities=ProviderCapability(
                        chat=True, reasoning=True, coding=True, tools=True, files=True, vision=True, audio=True, agent=True
                    ),
                    context_window=1000000,
                    cost_input=0.0004,
                    cost_output=0.0016,
                    available=True,
                ),
            ],
        )

    async def _invoke_remote(self, request: ProviderAdapterRequest) -> tuple[str, int, int]:
        contents = [{"role": "user", "parts": [{"text": request.prompt}]}]
        payload: dict[str, object] = {
            "contents": contents,
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.max_tokens,
            },
        }
        if request.system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": request.system_prompt}]}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(
                f"{self.endpoint}/models/{request.model}:generateContent",
                params={"key": str(self.api_key)},
                json=payload,
            )
            res.raise_for_status()
            data = res.json()
            candidates = data.get("candidates", [])
            parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
            text = "".join(p.get("text", "") for p in parts)
            usage = data.get("usageMetadata", {})
            return (
                text,
                int(usage.get("promptTokenCount", estimate_token_count(request.prompt))),
                int(usage.get("candidatesTokenCount", estimate_token_count(text))),
            )
