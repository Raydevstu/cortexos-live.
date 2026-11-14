from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from cortexos_events import InMemoryEventBus, build_event
from cortexos_types import CortexEvent, StudioHandoffRequest
from cortexos_types.enums import CortexEventType

from app.schemas import AgentMeshMessage


class DirectStudioMessagingViolation(PermissionError):
    """Raised whenever a studio attempts direct studio-to-studio messaging bypassing Jarvis."""


class AgentMeshController:
    """Enforces CortexOS Constitution: NO direct studio-to-studio messaging; all handoffs route through Jarvis."""

    def __init__(self, event_bus: InMemoryEventBus) -> None:
        self._event_bus = event_bus
        self._messages: list[AgentMeshMessage] = []
        self._handoffs: list[StudioHandoffRequest] = []

    async def route_message(
        self,
        *,
        project_id: str,
        from_agent: str,
        to_agent: str,
        summary: str,
        artifact_ids: list[str] | None = None,
        routed_via_jarvis: bool = True,
    ) -> tuple[AgentMeshMessage, CortexEvent]:
        if not routed_via_jarvis:
            raise DirectStudioMessagingViolation(
                f"Constitution violation: direct studio messaging ({from_agent} -> {to_agent}) is forbidden. "
                "All coordination must traverse Jarvis AgentMeshController."
            )
        if from_agent == to_agent:
            raise ValueError("Source and destination agents must be distinct for handoff routing.")

        msg = AgentMeshMessage(
            id=f"mesh-{uuid4().hex[:10]}",
            project_id=project_id,
            from_agent=from_agent,
            to_agent=to_agent,
            via_jarvis=True,
            message_type="handoff",
            summary=summary,
            artifact_ids=list(artifact_ids or []),
            recorded_at=datetime.now(timezone.utc),
        )
        self._messages.insert(0, msg)

        event = build_event(
            event_type=CortexEventType.AGENT_HANDOFF,
            source="jarvis-agent-mesh",
            project_id=project_id,
            payload={
                "meshMessageId": msg.id,
                "fromAgent": from_agent,
                "toAgent": to_agent,
                "artifactIds": msg.artifact_ids,
                "summary": summary,
            },
        )
        await self._event_bus.publish(event)
        return msg, event

    async def execute_handoff(
        self, handoff: StudioHandoffRequest
    ) -> tuple[AgentMeshMessage, CortexEvent]:
        if not handoff.artifact_ids:
            raise ValueError("Studio handoff requires at least one validated artifact ID.")
        self._handoffs.insert(0, handoff)
        return await self.route_message(
            project_id=handoff.project_id,
            from_agent=handoff.from_studio_id,
            to_agent=handoff.to_studio_id,
            summary=handoff.summary,
            artifact_ids=handoff.artifact_ids,
            routed_via_jarvis=True,
        )

    def list_messages(self, project_id: str | None = None) -> list[AgentMeshMessage]:
        if project_id is None:
            return list(self._messages)
        return [m for m in self._messages if m.project_id == project_id]

    def list_handoffs(self, project_id: str | None = None) -> list[StudioHandoffRequest]:
        if project_id is None:
            return list(self._handoffs)
        return [h for h in self._handoffs if h.project_id == project_id]
