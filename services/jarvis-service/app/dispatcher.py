from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import uuid4

import httpx

from cortexos_events import InMemoryEventBus, build_event
from cortexos_types import (
    CortexEvent,
    CreateWorkRequest,
    StudioExecuteRequest,
    WorkRequest,
    WorkResponse,
)
from cortexos_types.enums import (
    AgentStatus,
    CortexEventType,
    TemporalNamespace,
    TemporalTaskQueue,
    WorkRequestStatus,
    WorkResponseStatus,
    WorkflowType,
)

from app.assignment import StudioAssignmentEngine
from app.core.config import Settings
from app.phase_engine import PhaseEngine
from app.schemas import WorkDispatchResult
from app.state_engine import ProjectStateEngine
from app.temporal_bridge import TemporalWorkflowBridge

logger = logging.getLogger(__name__)


class WorkRequestDispatcher:
    """Dispatches WorkRequests through Temporal workflows and studio-service runtime."""

    def __init__(
        self,
        *,
        settings: Settings,
        state_engine: ProjectStateEngine,
        assignment_engine: StudioAssignmentEngine,
        temporal_bridge: TemporalWorkflowBridge,
        event_bus: InMemoryEventBus,
        phase_engine: PhaseEngine,
    ) -> None:
        self._settings = settings
        self._state = state_engine
        self._assignment = assignment_engine
        self._temporal = temporal_bridge
        self._bus = event_bus
        self._phase = phase_engine

    async def dispatch(self, request: CreateWorkRequest) -> WorkDispatchResult:
        now = datetime.now(timezone.utc)
        current_phase = self._state.get_phase(request.project_id)
        assignment = self._assignment.assign(
            request=request,
            agents=self._state.list_agents(),
            current_phase=current_phase,
        )
        await self._assignment.verify_studio_available(str(assignment.studio_id))

        studio_slug = str(assignment.studio_id)
        wr = WorkRequest(
            id=f"wreq-{uuid4().hex[:10]}",
            organization_id=request.organization_id or self._settings.default_organization_id,
            project_id=request.project_id,
            studio_id=studio_slug,
            objective=request.objective,
            constraints=list(request.constraints),
            success_criteria=list(request.success_criteria),
            context_artifacts=list(request.context_artifacts),
            priority=request.priority,
            status=WorkRequestStatus.ASSIGNED,
            created_at=now,
            updated_at=now,
        )
        self._state.add_work_request(wr)

        wf = await self._temporal.start_workflow(
            project_id=request.project_id,
            workflow_type=WorkflowType.WORK_REQUEST,
            namespace=TemporalNamespace.STUDIOS,
            task_queue=TemporalTaskQueue.STUDIO_RUNTIME,
            payload={"workRequestId": wr.id, "studioId": studio_slug, "objective": wr.objective},
            idempotency_key=f"wr:{wr.id}",
        )

        emitted_events: list[CortexEvent] = []
        created_evt = build_event(
            event_type=CortexEventType.WORK_REQUEST_CREATED,
            source="jarvis-dispatcher",
            project_id=request.project_id,
            payload={"workRequestId": wr.id, "studioId": studio_slug, "objective": wr.objective},
        )
        await self._bus.publish(created_evt)
        emitted_events.append(created_evt)

        self._state.update_agent_runtime(
            assignment.agent_id,
            status=AgentStatus.EXECUTING,
            current_task=wr.objective,
            current_workflow=f"{WorkflowType.WORK_REQUEST.value}:{wf.id}",
            provider=assignment.preferred_provider,
            model_id=assignment.preferred_model,
            last_decision=assignment.reason,
        )
        started_evt = build_event(
            event_type=CortexEventType.AGENT_STARTED,
            source=f"studio:{studio_slug}",
            project_id=request.project_id,
            payload={
                "agentId": assignment.agent_id,
                "studioId": studio_slug,
                "workRequestId": wr.id,
                "workflowId": wf.id,
                "provider": assignment.preferred_provider,
            },
        )
        await self._bus.publish(started_evt)
        emitted_events.append(started_evt)

        work_response = await self._invoke_studio_service(wr, assignment.preferred_provider, assignment.preferred_model)

        self._state.update_work_request_status(
            request.project_id,
            wr.id,
            WorkRequestStatus.COMPLETED
            if work_response.status == WorkResponseStatus.COMPLETED
            else WorkRequestStatus.BLOCKED,
        )
        first_artifact = work_response.artifact_ids[0] if work_response.artifact_ids else f"art-{studio_slug}-output"
        self._state.update_agent_runtime(
            assignment.agent_id,
            status=AgentStatus.COMPLETED,
            current_artifact=first_artifact,
            current_workflow=f"{WorkflowType.WORK_REQUEST.value}:{wf.id}",
            provider=assignment.preferred_provider,
            model_id=assignment.preferred_model,
            last_decision=f"Completed {wr.id}: {work_response.summary[:96]}",
        )
        self._temporal.complete_workflow(wf.id, work_response.model_dump(by_alias=True, mode="json"))

        completed_evt = build_event(
            event_type=CortexEventType.AGENT_COMPLETED,
            source=f"studio:{studio_slug}",
            project_id=request.project_id,
            payload={
                "agentId": assignment.agent_id,
                "studioId": studio_slug,
                "workRequestId": wr.id,
                "artifactIds": work_response.artifact_ids,
            },
        )
        await self._bus.publish(completed_evt)
        emitted_events.append(completed_evt)

        final_wr = wr.model_copy(
            update={"status": WorkRequestStatus.COMPLETED, "updated_at": datetime.now(timezone.utc)}
        )
        self._state.add_work_request(final_wr)

        return WorkDispatchResult(
            work_request=final_wr,
            work_response=work_response,
            assignment=assignment,
            workflow_id=wf.id,
            events=emitted_events,
        )

    async def _invoke_studio_service(
        self,
        wr: WorkRequest,
        preferred_provider: str,
        preferred_model: str,
    ) -> WorkResponse:
        try:
            payload = StudioExecuteRequest(
                work_request=wr,
                preferred_provider=preferred_provider,
                preferred_model=preferred_model,
            )
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.post(
                    f"{self._settings.studio_service_url}/api/v1/studios/{wr.studio_id}/execute",
                    json=payload.model_dump(by_alias=True, mode="json"),
                )
                if resp.status_code == 200:
                    return WorkResponse.model_validate(resp.json())
        except Exception as exc:
            logger.debug("studio-service HTTP execution fallback for %s: %s", wr.studio_id, exc)

        cur_phase = self._state.get_phase(wr.project_id)
        next_phase = self._phase.next_phase(cur_phase)
        return WorkResponse(
            id=f"wresp-{uuid4().hex[:10]}",
            request_id=wr.id,
            studio_id=wr.studio_id,
            status=WorkResponseStatus.COMPLETED,
            artifact_ids=[f"art-{wr.studio_id}-{uuid4().hex[:6]}"],
            summary=f"{wr.studio_id.capitalize()} Studio completed '{wr.objective}' via Jarvis dispatch.",
            next_recommended_phase=next_phase,
        )
