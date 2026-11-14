from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from cortexos_types import (
    AgentContext,
    AgentResponse,
    Artifact,
    StudioHandoffRequest,
)
from cortexos_types.enums import AgentStatus


class CortexAgent(ABC):
    """Canonical CortexAgent SDK interface implemented by every Studio agent."""

    id: str
    name: str
    role: str
    studio_id: str
    status: AgentStatus

    @abstractmethod
    async def plan(self, context: AgentContext | None = None) -> list[str]:
        """Produce ordered execution steps grounded in context and constraints."""

    @abstractmethod
    async def execute(self, context: AgentContext | None = None) -> AgentResponse:
        """Execute planned steps and return AgentResponse."""

    @abstractmethod
    async def validate(self) -> bool:
        """Validate agent outputs against studio rules and quality gates."""

    @abstractmethod
    async def summarize(self) -> str:
        """Summarize completed work and findings."""

    @abstractmethod
    async def create_artifact(self, payload: dict[str, Any] | None = None) -> list[Artifact]:
        """Materialize tracked Artifact outputs."""

    @abstractmethod
    async def handoff(self) -> StudioHandoffRequest | None:
        """Prepare a Jarvis-mediated Agent Mesh handoff."""
