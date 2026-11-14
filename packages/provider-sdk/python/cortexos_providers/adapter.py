from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Any

from pydantic import Field

from cortexos_types import CortexModel, ModelDescriptor, ProviderId, ProviderType
from cortexos_types.enums import TerminalMode


class ProviderAdapterRequest(CortexModel):
    request_id: str
    model: str
    prompt: str
    mode: TerminalMode = TerminalMode.CHAT
    system_prompt: str | None = None
    tools: list[str] = Field(default_factory=list)
    temperature: float = 0.2
    max_tokens: int = 2048
    metadata: dict[str, Any] = Field(default_factory=dict)


class ProviderAdapterResponse(CortexModel):
    request_id: str
    provider: str
    model: str
    output: str
    input_tokens: int
    output_tokens: int
    latency_ms: float
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)


class ProviderStreamChunk(CortexModel):
    request_id: str
    provider: str
    model: str
    delta: str
    done: bool = False


class ProviderAdapter(ABC):
    """Unified Provider SDK contract implemented by all CortexOS model providers."""

    provider_id: ProviderId | str
    display_name: str
    provider_type: ProviderType

    @abstractmethod
    async def connect(self) -> None:
        """Initialize client resources and validate configuration."""

    @abstractmethod
    async def list_models(self) -> list[ModelDescriptor]:
        """Return registered ModelDescriptor entries exposed by this provider."""

    @abstractmethod
    async def generate(self, request: ProviderAdapterRequest) -> ProviderAdapterResponse:
        """Execute a synchronous/async completion request against this provider."""

    @abstractmethod
    async def stream(
        self, request: ProviderAdapterRequest
    ) -> AsyncIterator[ProviderStreamChunk]:
        """Stream completion deltas."""

    @abstractmethod
    async def embeddings(self, texts: list[str], model: str | None = None) -> list[list[float]]:
        """Generate vector embeddings for input text chunks."""

    @abstractmethod
    async def cancel(self, request_id: str) -> bool:
        """Cancel an in-flight generation request if active."""

    @abstractmethod
    async def health_check(self) -> bool:
        """Probe provider reachability and readiness."""
