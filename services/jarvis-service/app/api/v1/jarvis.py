from __future__ import annotations

from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status

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

from app.core.security import RequestContext, require_permission
from app.mesh import DirectStudioMessagingViolation
from app.schemas import (
    AgentMeshMessage,
    AgentRuntimeTelemetry,
    CouncilConveneRequest,
    JarvisPresenceSnapshot,
    PendingApprovalRecord,
    RiskAssessmentReport,
    WorkDispatchResult,
)
from app.supervisor import JarvisSupervisorEngine

router = APIRouter(prefix="/jarvis", tags=["jarvis"])


@lru_cache
def get_jarvis_engine() -> JarvisSupervisorEngine:
    return JarvisSupervisorEngine()


@router.get("/state/{project_id}", response_model=JarvisProjectState)
async def get_project_state(
    project_id: str,
    _: RequestContext = Depends(require_permission("project", "read")),
    engine: JarvisSupervisorEngine = Depends(get_jarvis_engine),
) -> JarvisProjectState:
    return engine.get_project_state(project_id)


@router.post("/work-requests", response_model=WorkDispatchResult, status_code=status.HTTP_201_CREATED)
async def dispatch_work_request(
    payload: CreateWorkRequest,
    _: RequestContext = Depends(require_permission("studio", "execute")),
    engine: JarvisSupervisorEngine = Depends(get_jarvis_engine),
) -> WorkDispatchResult:
    try:
        return await engine.dispatch_work_request(payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


@router.post("/phase/advance", response_model=JarvisProjectState)
async def advance_phase(
    payload: AdvancePhaseRequest,
    ctx: RequestContext = Depends(require_permission("project", "write")),
    engine: JarvisSupervisorEngine = Depends(get_jarvis_engine),
) -> JarvisProjectState:
    enriched = payload.model_copy(
        update={"approved_by": payload.approved_by or ctx.subject_id}
    )
    try:
        return await engine.advance_phase(enriched)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


@router.get("/approvals/{project_id}", response_model=list[PendingApprovalRecord])
async def list_pending_approvals(
    project_id: str,
    _: RequestContext = Depends(require_permission("project", "read")),
    engine: JarvisSupervisorEngine = Depends(get_jarvis_engine),
) -> list[PendingApprovalRecord]:
    return engine.approval_engine.list_pending(project_id)


@router.post("/approvals", response_model=PendingApprovalRecord)
async def submit_approval_decision(
    payload: ApprovalDecisionRequest,
    _: RequestContext = Depends(require_permission("artifact", "approve")),
    engine: JarvisSupervisorEngine = Depends(get_jarvis_engine),
) -> PendingApprovalRecord:
    return await engine.decide_approval(payload)


@router.post("/council", response_model=AgentCouncilReport)
async def convene_council(
    payload: CouncilConveneRequest,
    _: RequestContext = Depends(require_permission("studio", "execute")),
    engine: JarvisSupervisorEngine = Depends(get_jarvis_engine),
) -> AgentCouncilReport:
    return await engine.convene_council(
        project_id=payload.project_id,
        objective=payload.objective,
        studios=payload.studios or None,
    )


@router.get("/risks/{project_id}", response_model=RiskAssessmentReport)
async def assess_risks(
    project_id: str,
    _: RequestContext = Depends(require_permission("project", "read")),
    engine: JarvisSupervisorEngine = Depends(get_jarvis_engine),
) -> RiskAssessmentReport:
    return engine.assess_risks(project_id)


@router.post("/handoff", response_model=AgentMeshMessage)
async def route_studio_handoff(
    payload: StudioHandoffRequest,
    _: RequestContext = Depends(require_permission("studio", "execute")),
    engine: JarvisSupervisorEngine = Depends(get_jarvis_engine),
) -> AgentMeshMessage:
    try:
        return await engine.route_handoff(payload)
    except DirectStudioMessagingViolation as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc


@router.get("/warroom/{project_id}", response_model=WarRoomSnapshot)
async def get_war_room_snapshot(
    project_id: str,
    _: RequestContext = Depends(require_permission("project", "read")),
    engine: JarvisSupervisorEngine = Depends(get_jarvis_engine),
) -> WarRoomSnapshot:
    return engine.get_war_room_snapshot(project_id)


@router.get("/agents", response_model=list[AgentRuntimeTelemetry])
async def list_agent_telemetry(
    _: RequestContext = Depends(require_permission("project", "read")),
    engine: JarvisSupervisorEngine = Depends(get_jarvis_engine),
) -> list[AgentRuntimeTelemetry]:
    return engine.get_agent_telemetry()


@router.get("/presence/{project_id}", response_model=JarvisPresenceSnapshot)
async def get_presence_snapshot(
    project_id: str,
    _: RequestContext = Depends(require_permission("project", "read")),
    engine: JarvisSupervisorEngine = Depends(get_jarvis_engine),
) -> JarvisPresenceSnapshot:
    return engine.get_presence_snapshot(project_id)


@router.get("/events", response_model=list[CortexEvent])
async def list_recent_events(
    limit: int = 50,
    _: RequestContext = Depends(require_permission("project", "read")),
    engine: JarvisSupervisorEngine = Depends(get_jarvis_engine),
) -> list[CortexEvent]:
    return engine.recent_events(limit)


@router.websocket("/ws/presence/{project_id}")
async def presence_websocket(websocket: WebSocket, project_id: str) -> None:
    await websocket.accept()
    engine = get_jarvis_engine()
    snapshot = engine.get_presence_snapshot(project_id)
    await websocket.send_json(
        {
            "type": "presence.snapshot",
            "payload": snapshot.model_dump(by_alias=True, mode="json"),
        }
    )

    async def _forward(event: CortexEvent) -> None:
        await websocket.send_json(
            {
                "type": "event.dispatched",
                "event": event.model_dump(by_alias=True, mode="json"),
                "agents": [
                    t.model_dump(by_alias=True, mode="json")
                    for t in engine.get_agent_telemetry()
                ],
            }
        )

    engine.event_bus.subscribe("*", _forward)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        return
