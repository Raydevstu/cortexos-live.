from __future__ import annotations

import hashlib
import math
import re
import time
from collections.abc import AsyncIterator
from typing import Any

import httpx

from cortexos_providers import (
    ProviderAdapter,
    ProviderAdapterRequest,
    ProviderAdapterResponse,
    ProviderStreamChunk,
)
from cortexos_types import ModelDescriptor
from cortexos_types.enums import ProviderId, ProviderType


def estimate_token_count(text: str) -> int:
    if not text:
        return 0
    return max(1, math.ceil(len(text) / 4))


def _deterministic_embed(text: str, dims: int = 384) -> list[float]:
    vec = [0.0] * dims
    tokens = re.findall(r"[a-z0-9_]+", text.lower())
    for idx, tok in enumerate(tokens):
        features = [tok]
        if idx + 1 < len(tokens):
            features.append(f"{tok}_{tokens[idx + 1]}")
        for feat in features:
            digest = hashlib.sha256(feat.encode("utf-8")).digest()
            bucket = int.from_bytes(digest[:4], "little") % dims
            vec[bucket] += 1.0 if (digest[4] & 1) == 0 else -1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


class BaseHttpProviderAdapter(ProviderAdapter):
    """Shared ProviderAdapter implementation supporting live HTTP APIs and local execution fallback."""

    def __init__(
        self,
        *,
        provider_id: ProviderId,
        display_name: str,
        provider_type: ProviderType,
        endpoint: str,
        api_key: str | None = None,
        models: list[ModelDescriptor],
        allow_local_simulation: bool = True,
        timeout: float = 30.0,
    ) -> None:
        self.provider_id = provider_id
        self.display_name = display_name
        self.provider_type = provider_type
        self.endpoint = endpoint.rstrip("/")
        self.api_key = api_key
        self._models = models
        self.allow_local_simulation = allow_local_simulation
        self.timeout = timeout
        self._cancelled_requests: set[str] = set()
        self._simulated_failure: str | None = None

    def set_simulated_failure(self, reason: str | None) -> None:
        """Allow deterministic failover & circuit-breaker testing without external outages."""
        self._simulated_failure = reason

    async def connect(self) -> None:
        return None

    async def list_models(self) -> list[ModelDescriptor]:
        return list(self._models)

    async def cancel(self, request_id: str) -> bool:
        self._cancelled_requests.add(request_id)
        return True

    async def health_check(self) -> bool:
        if self._simulated_failure:
            return False
        if self.provider_type == ProviderType.LOCAL:
            if self.allow_local_simulation:
                return True
            try:
                async with httpx.AsyncClient(timeout=2.5) as client:
                    probe_url = (
                        f"{self.endpoint}/api/tags"
                        if self.provider_id == ProviderId.OLLAMA
                        else f"{self.endpoint}/models"
                    )
                    res = await client.get(probe_url)
                    return res.is_success
            except Exception:
                return False
        return bool(self.api_key or self.allow_local_simulation)

    async def _invoke_remote(
        self, request: ProviderAdapterRequest
    ) -> tuple[str, int, int]:
        """Override in vendor adapters for specific REST wire formats when api_key/daemon is configured."""
        raise NotImplementedError("Remote transport requires vendor-specific implementation.")

    async def generate(self, request: ProviderAdapterRequest) -> ProviderAdapterResponse:
        if request.request_id in self._cancelled_requests:
            raise RuntimeError(f"Request '{request.request_id}' was cancelled.")
        if self._simulated_failure:
            raise RuntimeError(
                f"Provider '{self.provider_id.value}' unavailable: {self._simulated_failure}"
            )

        started = time.perf_counter()
        use_remote = (
            bool(self.api_key)
            if self.provider_type != ProviderType.LOCAL
            else not self.allow_local_simulation
        )
        if use_remote:
            try:
                output, in_toks, out_toks = await self._invoke_remote(request)
                elapsed_ms = round((time.perf_counter() - started) * 1000.0, 2)
                return ProviderAdapterResponse(
                    request_id=request.request_id,
                    provider=self.provider_id.value,
                    model=request.model,
                    output=output,
                    input_tokens=in_toks,
                    output_tokens=out_toks,
                    latency_ms=elapsed_ms,
                    tool_calls=[{"tool": t, "status": "scheduled"} for t in request.tools],
                )
            except Exception:
                if not self.allow_local_simulation:
                    raise

        if not self.allow_local_simulation:
            raise RuntimeError(
                f"Credentials missing for provider '{self.provider_id.value}' and fallback is disabled."
            )

        in_toks = estimate_token_count(
            f"{request.system_prompt or ''}\n{request.prompt}"
        )
        output = (
            f"[{self.display_name} :: {request.model} :: mode={request.mode.value}] "
            f"Synthesized execution response for: {request.prompt[:180]}"
        )
        out_toks = estimate_token_count(output)
        elapsed_ms = round((time.perf_counter() - started) * 1000.0 + 1.5, 2)
        return ProviderAdapterResponse(
            request_id=request.request_id,
            provider=self.provider_id.value,
            model=request.model,
            output=output,
            input_tokens=in_toks,
            output_tokens=out_toks,
            latency_ms=elapsed_ms,
            tool_calls=[{"tool": t, "status": "ready"} for t in request.tools],
        )

    async def stream(
        self, request: ProviderAdapterRequest
    ) -> AsyncIterator[ProviderStreamChunk]:
        resp = await self.generate(request)
        words = resp.output.split(" ")
        for idx, word in enumerate(words):
            suffix = "" if idx == len(words) - 1 else " "
            yield ProviderStreamChunk(
                request_id=request.request_id,
                provider=resp.provider,
                model=resp.model,
                delta=f"{word}{suffix}",
                done=idx == len(words) - 1,
            )

    async def embeddings(
        self, texts: list[str], model: str | None = None
    ) -> list[list[float]]:
        if self._simulated_failure:
            raise RuntimeError(
                f"Provider '{self.provider_id.value}' unavailable: {self._simulated_failure}"
            )
        return [_deterministic_embed(t) for t in texts]
