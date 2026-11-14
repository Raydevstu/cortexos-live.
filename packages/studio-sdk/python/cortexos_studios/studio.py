from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from pydantic import Field

from cortexos_types import (
    AgentMemory,
    Artifact,
    CortexModel,
    StudioHandoffRequest,
    StudioManifest,
    WorkRequest,
    WorkResponse,
)
from cortexos_types.enums import ArtifactType


class StudioArtifactDraft(CortexModel):
    artifact_type: ArtifactType
    title: str
    summary: str
    content: str
    version: str = "1.0.0"
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class StudioContextStack(CortexModel):
    """6-layer Context Injection Stack provided to Studios at execution time."""

    system_identity: str
    mission: str
    constraints: list[str] = Field(default_factory=list)
    local_knowledge: str = ""
    local_memory: list[AgentMemory] = Field(default_factory=list)
    context_artifacts: list[Artifact] = Field(default_factory=list)


class Studio(ABC):
    """Base contract implemented by every CortexOS execution Studio."""

    manifest: StudioManifest

    @abstractmethod
    async def initialize(self) -> None:
        """Load studio manifest, local memory, skills, templates, and tool adapters."""

    @abstractmethod
    async def execute(self, request: WorkRequest) -> WorkResponse:
        """Execute a Jarvis WorkRequest and emit tracked artifacts + WorkResponse."""

    @abstractmethod
    async def validate(self, artifact_id: str) -> bool:
        """Validate an artifact against studio structural and quality gates."""

    @abstractmethod
    async def handoff(self) -> StudioHandoffRequest | None:
        """Prepare a Jarvis-mediated handoff package for the next workflow phase."""


class DesignStudio(Studio, ABC):
    """Specialized Studio SDK contract for Experience Architecture (Design Studio)."""

    @abstractmethod
    async def create_wireframes(self) -> list[StudioArtifactDraft]:
        """Generate spatial wireframe specifications from validated product requirements."""

    @abstractmethod
    async def create_flows(self) -> list[StudioArtifactDraft]:
        """Generate end-to-end user flows, states, and transition diagrams."""

    @abstractmethod
    async def create_design_system(self) -> list[StudioArtifactDraft]:
        """Generate semantic design tokens, component hierarchy, and layout rules."""

    @abstractmethod
    async def accessibility_review(self) -> dict[str, Any]:
        """Run WCAG 2.1 AA accessibility & contrast verification over generated outputs."""


class ArchitectureStudio(Studio, ABC):
    """Specialized Studio SDK contract for Systems Architecture."""

    @abstractmethod
    async def create_architecture(self) -> list[StudioArtifactDraft]:
        """Generate high-level system architecture specifications."""

    @abstractmethod
    async def create_openapi(self) -> list[StudioArtifactDraft]:
        """Generate OpenAPI service contracts."""

    @abstractmethod
    async def create_database_schema(self) -> list[StudioArtifactDraft]:
        """Generate relational and graph database schemas."""

    @abstractmethod
    async def create_infrastructure(self) -> list[StudioArtifactDraft]:
        """Generate infrastructure topology plans."""
