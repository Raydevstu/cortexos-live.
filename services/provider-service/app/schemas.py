from __future__ import annotations

from pydantic import Field

from cortexos_types import CortexModel


class EmbedRequest(CortexModel):
    texts: list[str] = Field(min_length=1)
    preferred_provider: str | None = None


class EmbedResponse(CortexModel):
    provider: str
    dimensions: int
    embeddings: list[list[float]]


class SimulateProviderFailureRequest(CortexModel):
    reason: str | None = None
