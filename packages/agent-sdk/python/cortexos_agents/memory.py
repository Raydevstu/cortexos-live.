from __future__ import annotations

from pydantic import Field

from cortexos_types import AgentMemory, CortexModel, MainBrainContext


class AgentMemoryScope(CortexModel):
    """Enforces CortexOS Global Memory read-only rule while allowing Agent Local Memory."""

    agent_id: str
    local_memories: list[AgentMemory] = Field(default_factory=list)
    global_memory_read_only: bool = True
    global_context: MainBrainContext | None = None
