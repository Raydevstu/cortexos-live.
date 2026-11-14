from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from cortexos_events import InMemoryEventBus, build_event
from cortexos_types import AgentCouncilOpinion, AgentCouncilReport, CortexEvent
from cortexos_types.enums import CortexEventType, StudioId, WorkflowType

from app.temporal_bridge import TemporalWorkflowBridge

COUNCIL_ROSTER: list[tuple[str, str, str, str, float]] = [
    (
        "discovery",
        StudioId.DISCOVERY.value,
        "Verify objective solves validated user friction and preserves provenance.",
        "Anchor deliverables in primary user research claims.",
        "Unvalidated scope assumptions",
        0.89,
    ),
    (
        "product",
        StudioId.PRODUCT.value,
        "Ensure PRD acceptance criteria remain crisp and phase-bounded.",
        "Enforce milestone boundary before expanding feature surface.",
        "Feature creep across phases",
        0.91,
    ),
    (
        "design",
        StudioId.DESIGN.value,
        "Guarantee WCAG 2.1 AA contrast, keyboard traversal, and responsive MainBrain UX.",
        "Publish design tokens + wireframe parity checks before implementation.",
        "Viewport clipping or hidden state transitions",
        0.94,
    ),
    (
        "architecture",
        StudioId.ARCHITECTURE.value,
        "Enforce immutable source provenance, RBAC, and zero direct studio-to-studio calls.",
        "Preserve strict SDK contracts across Python & TypeScript boundaries.",
        "Contract drift between FastAPI services and frontend WS hub",
        0.93,
    ),
    (
        "development",
        StudioId.DEVELOPMENT.value,
        "Keep runtime logic modular with unit & integration tests before rollout.",
        "Maintain idempotent event handlers and deterministic fallbacks.",
        "StrictMode double-invocation or race condition",
        0.92,
    ),
    (
        "qa",
        StudioId.QA.value,
        "Validate E2E user journeys under headless Chromium & API regression tests.",
        "Require passing contract + Playwright assertions prior to approval.",
        "Silent fallback hiding degraded provider errors",
        0.90,
    ),
    (
        "release",
        StudioId.RELEASE.value,
        "Ensure health/ready probes and rollback runbooks exist for every service.",
        "Stage deployment with automated circuit-breaker failover checks.",
        "Missing /ready dependency gate during rollout",
        0.88,
    ),
]


class AgentCouncilRuntime:
    """Convenes Specialist Studios to deliberate on high-impact decisions & risks."""

    def __init__(
        self,
        event_bus: InMemoryEventBus,
        temporal_bridge: TemporalWorkflowBridge,
    ) -> None:
        self._event_bus = event_bus
        self._temporal_bridge = temporal_bridge
        self._reports: list[AgentCouncilReport] = []

    async def convene(
        self,
        *,
        project_id: str,
        objective: str,
        studios: list[str] | None = None,
    ) -> tuple[AgentCouncilReport, list[CortexEvent]]:
        wf = await self._temporal_bridge.start_workflow(
            project_id=project_id,
            workflow_type=WorkflowType.AGENT_COUNCIL,
            payload={"objective": objective, "studios": studios or []},
        )

        selected = {s.lower() for s in studios} if studios else None
        opinions: list[AgentCouncilOpinion] = []
        decisions: list[str] = []
        risks: list[str] = []

        for agent_id, studio_id, opinion, rec, risk, conf in COUNCIL_ROSTER:
            if selected and studio_id not in selected:
                continue
            opinions.append(
                AgentCouncilOpinion(
                    agent_id=agent_id,
                    studio_id=studio_id,
                    opinion=f"{opinion} [Objective: {objective[:72]}]",
                    recommendation=rec,
                    risk=risk,
                    confidence=conf,
                )
            )
            decisions.append(f"[{studio_id.upper()}] {rec}")
            risks.append(f"[{studio_id.upper()}] {risk}")

        report = AgentCouncilReport(
            id=f"council-{uuid4().hex[:10]}",
            project_id=project_id,
            objective=objective,
            opinions=opinions,
            consensus_summary=(
                f"Agent Council reached consensus across {len(opinions)} studios for '{objective}': "
                "proceed via Jarvis-gated WorkRequests with Temporal tracking and Event SDK telemetry."
            ),
            decisions=decisions,
            risks=risks,
            created_at=datetime.now(timezone.utc),
        )
        self._reports.insert(0, report)
        self._temporal_bridge.complete_workflow(wf.id, {"councilReportId": report.id})

        events: list[CortexEvent] = []
        wf_event = build_event(
            event_type=CortexEventType.WORKFLOW_COMPLETED,
            source="jarvis-council-runtime",
            project_id=project_id,
            payload={
                "workflowId": wf.id,
                "workflowType": WorkflowType.AGENT_COUNCIL.value,
                "projectId": project_id,
                "councilReportId": report.id,
            },
        )
        await self._event_bus.publish(wf_event)
        events.append(wf_event)
        return report, events

    def latest_report(self, project_id: str | None = None) -> AgentCouncilReport | None:
        for rep in self._reports:
            if project_id is None or rep.project_id == project_id:
                return rep
        return None
