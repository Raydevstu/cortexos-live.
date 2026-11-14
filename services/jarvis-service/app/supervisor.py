from __future__ import annotations

from datetime import datetime, timezone

from cortexos_events import InMemoryEventBus, build_event
from cortexos_types import (
    AdvancePhaseRequest,
    AgentCouncilReport,
    ApprovalDecisionRequest,
    CortexEvent,
    CreateWorkRequest,
    JarvisProjectState,
    StudioHandoffRequest,
    WarRoomSnapshot,
)
from cortexos_types.enums import (
    AgentStatus,
    CortexEventType,
    ProjectPhase,
    WorkflowType,
)

from app.assignment import StudioAssignmentEngine
from app.core.config import Settings, get_settings
from app.council import AgentCouncilRuntime
from app.dispatcher import WorkRequestDispatcher
from app.gates import ApprovalEngine
from app.mesh import AgentMeshController
from app.phase_engine import PhaseEngine
from app.risk import RiskAssessmentReport, RiskEngine
from app.schemas import (
    AgentMeshMessage,
    AgentRuntimeTelemetry,
    JarvisPresenceSnapshot,
    PendingApprovalRecord,
    WorkDispatchResult,
)
from app.state_engine import ProjectStateEngine
from app.temporal_bridge import TemporalWorkflowBridge


class JarvisSupervisorEngine:
    """Top-level CortexOS Supervisor Runtime wiring state, phases, approvals, risks, dispatch, mesh, council, and Temporal workflows."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.event_bus = InMemoryEventBus()
        self.phase_engine = PhaseEngine()
        self.state_engine = ProjectStateEngine(self.phase_engine)
        self.approval_engine = ApprovalEngine()
        self.risk_engine = RiskEngine()
        self.assignment_engine = StudioAssignmentEngine(self.settings)
        self.mesh_controller = AgentMeshController(self.event_bus)
        self.temporal_bridge = TemporalWorkflowBridge(self.settings)
        self.council_runtime = AgentCouncilRuntime(self.event_bus, self.temporal_bridge)
        self.dispatcher = WorkRequestDispatcher(
            settings=self.settings,
            state_engine=self.state_engine,
            assignment_engine=self.assignment_engine,
            temporal_bridge=self.temporal_bridge,
            event_bus=self.event_bus,
            phase_engine=self.phase_engine,
        )

    def get_project_state(self, project_id: str) -> JarvisProjectState:
        pending = self.approval_engine.list_pending(project_id)
        return self.state_engine.build_project_state(
            project_id=project_id,
            pending_approval_count=len(pending),
        )

    async def dispatch_work_request(self, request: CreateWorkRequest) -> WorkDispatchResult:
        self.state_engine.update_agent_runtime(
            "jarvis",
            status=AgentStatus.PLANNING,
            current_task=f"Dispatching WorkRequest to {request.studio_id}",
            current_workflow=WorkflowType.WORK_REQUEST.value,
            last_decision=f"Routing '{request.objective[:64]}' via Agent Mesh",
        )
        result = await self.dispatcher.dispatch(request)
        self.state_engine.update_agent_runtime(
            "jarvis",
            status=AgentStatus.COMPLETED,
            current_artifact=result.work_response.artifact_ids[0] if result.work_response.artifact_ids else "",
            current_workflow=f"{WorkflowType.WORK_REQUEST.value}:{result.workflow_id}",
            last_decision=f"Dispatched {result.work_request.id} -> {result.assignment.studio_id}",
        )
        return result

    async def advance_phase(self, req: AdvancePhaseRequest) -> JarvisProjectState:
        current = self.state_engine.get_phase(req.project_id)
        pending = self.approval_engine.list_pending(req.project_id)
        work_requests = self.state_engine.list_work_requests(req.project_id)
        base_state = self.state_engine.build_project_state(
            project_id=req.project_id,
            pending_approval_count=len(pending),
        )
        allowed, target_phase, reasons = self.phase_engine.evaluate_transition(
            current_phase=current,
            target_phase=req.target_phase,
            work_requests=work_requests,
            pending_approval_count=len(pending),
            blocked_reasons=base_state.blocked_reasons,
        )
        if not allowed:
            raise ValueError("; ".join(reasons))

        wf = await self.temporal_bridge.start_workflow(
            project_id=req.project_id,
            workflow_type=WorkflowType.PROJECT_LIFECYCLE,
            payload={
                "fromPhase": current.value,
                "toPhase": target_phase.value,
                "approvedBy": req.approved_by or "jarvis",
            },
        )
        self.state_engine.set_phase(req.project_id, target_phase)
        self.state_engine.update_agent_runtime(
            "jarvis",
            status=AgentStatus.COMPLETED,
            current_task=f"Advanced project phase: {current.value} -> {target_phase.value}",
            current_workflow=f"{WorkflowType.PROJECT_LIFECYCLE.value}:{wf.id}",
            last_decision=f"Approved transition to {target_phase.value} ({req.notes or 'gate cleared'})",
        )
        self.temporal_bridge.complete_workflow(wf.id, {"phase": target_phase.value})

        evt = build_event(
            event_type=CortexEventType.PROJECT_PHASE_ADVANCED,
            source="jarvis-phase-engine",
            project_id=req.project_id,
            payload={
                "fromPhase": current.value,
                "toPhase": target_phase.value,
                "approvedBy": req.approved_by or "jarvis",
                "workflowId": wf.id,
            },
        )
        await self.event_bus.publish(evt)
        return self.get_project_state(req.project_id)

    async def request_approval(
        self,
        *,
        project_id: str,
        workflow_id: str,
        phase: ProjectPhase | str,
        requested_by: str,
        reason: str,
        artifact_id: str | None = None,
    ) -> PendingApprovalRecord:
        record = self.approval_engine.request_approval(
            project_id=project_id,
            workflow_id=workflow_id,
            phase=phase,
            requested_by=requested_by,
            reason=reason,
            artifact_id=artifact_id,
        )
        evt = build_event(
            event_type=CortexEventType.APPROVAL_REQUIRED,
            source="jarvis-approval-engine",
            project_id=project_id,
            payload={
                "approvalId": record.id,
                "workflowId": workflow_id,
                "artifactId": artifact_id or "",
                "requestedBy": requested_by,
            },
        )
        await self.event_bus.publish(evt)
        return record

    async def decide_approval(self, decision: ApprovalDecisionRequest) -> PendingApprovalRecord:
        record = self.approval_engine.decide(decision)
        self.state_engine.update_agent_runtime(
            "jarvis",
            status=AgentStatus.COMPLETED,
            current_artifact=decision.artifact_id or "",
            current_workflow=f"{WorkflowType.APPROVAL.value}:{decision.workflow_id}",
            last_decision=f"{'Approved' if decision.approved else 'Rejected'} gate by {decision.decided_by}",
        )
        evt = build_event(
            event_type=CortexEventType.APPROVAL_DECIDED,
            source="jarvis-approval-engine",
            project_id=record.project_id,
            payload={
                "approvalId": record.id,
                "workflowId": decision.workflow_id,
                "artifactId": decision.artifact_id,
                "approved": decision.approved,
                "decidedBy": decision.decided_by,
            },
        )
        await self.event_bus.publish(evt)
        return record

    async def convene_council(
        self,
        *,
        project_id: str,
        objective: str,
        studios: list[str] | None = None,
    ) -> AgentCouncilReport:
        self.state_engine.update_agent_runtime(
            "jarvis",
            status=AgentStatus.REVIEWING,
            current_task=f"Convening Agent Council: {objective[:64]}",
            current_workflow=WorkflowType.AGENT_COUNCIL.value,
        )
        report, _ = await self.council_runtime.convene(
            project_id=project_id,
            objective=objective,
            studios=studios,
        )
        self.state_engine.update_agent_runtime(
            "jarvis",
            status=AgentStatus.COMPLETED,
            current_artifact=report.id,
            current_workflow=WorkflowType.AGENT_COUNCIL.value,
            last_decision=report.consensus_summary[:120],
        )
        return report

    async def route_handoff(self, handoff: StudioHandoffRequest) -> AgentMeshMessage:
        msg, _ = await self.mesh_controller.execute_handoff(handoff)
        self.state_engine.update_agent_runtime(
            "jarvis",
            status=AgentStatus.COMPLETED,
            current_artifact=handoff.artifact_ids[0] if handoff.artifact_ids else "",
            last_decision=f"Mesh handoff {handoff.from_studio_id} -> {handoff.to_studio_id}",
        )
        return msg

    def assess_risks(self, project_id: str) -> RiskAssessmentReport:
        return self.risk_engine.assess(
            project_id=project_id,
            agents=self.state_engine.list_agents(),
            work_requests=self.state_engine.list_work_requests(project_id),
            pending_approvals=self.approval_engine.list_pending(project_id),
        )

    def get_war_room_snapshot(self, project_id: str) -> WarRoomSnapshot:
        council = self.council_runtime.latest_report(project_id)
        risk_report = self.assess_risks(project_id)
        return WarRoomSnapshot(
            project_id=project_id,
            active_workflows=self.temporal_bridge.list_workflows(project_id),
            agents=self.state_engine.list_agents(),
            council_opinions=council.opinions if council else [],
            pending_approvals=self.approval_engine.to_decision_requests(project_id),
            risks=[r.description for r in risk_report.risks],
            recent_artifacts=[],
            updated_at=datetime.now(timezone.utc),
        )

    def get_agent_telemetry(self) -> list[AgentRuntimeTelemetry]:
        telemetry: list[AgentRuntimeTelemetry] = []
        for agent in self.state_engine.list_agents():
            meta = self.state_engine.get_agent_meta(agent.id)
            telemetry.append(
                AgentRuntimeTelemetry(
                    agent=agent,
                    current_artifact=meta.get("current_artifact", ""),
                    current_workflow=meta.get("current_workflow", ""),
                    provider=meta.get("provider", "anthropic"),
                    runtime_state=meta.get("runtime_state", agent.status.value),
                    last_decision=meta.get("last_decision", ""),
                )
            )
        return telemetry

    def get_presence_snapshot(self, project_id: str) -> JarvisPresenceSnapshot:
        return JarvisPresenceSnapshot(
            project_state=self.get_project_state(project_id),
            agents=self.get_agent_telemetry(),
            recent_events=self.event_bus.recent_events(30),
            pending_approvals=self.approval_engine.to_decision_requests(project_id),
            risk_report=self.assess_risks(project_id),
            last_council=self.council_runtime.latest_report(project_id),
            mesh_messages=self.mesh_controller.list_messages(project_id),
            handoffs=self.mesh_controller.list_handoffs(project_id),
        )

    def recent_events(self, limit: int = 50) -> list[CortexEvent]:
        return self.event_bus.recent_events(limit)
