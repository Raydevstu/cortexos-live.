from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request, status

from cortexos_types import ApprovalDecisionRequest, Workflow, WorkflowExecution, WorkflowStartRequest

from app.runtime import TemporalRuntimeManager

router = APIRouter(prefix="/workflows", tags=["workflows"])


def _get_manager(request: Request) -> TemporalRuntimeManager:
    return request.app.state.runtime_manager


@router.get("/topology")
async def get_topology(request: Request) -> dict:
    return _get_manager(request).topology_summary()


@router.post("/start", response_model=Workflow, status_code=status.HTTP_201_CREATED)
async def start_workflow(payload: WorkflowStartRequest, request: Request) -> Workflow:
    manager = _get_manager(request)
    try:
        return await manager.start_workflow(payload)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("", response_model=list[Workflow])
async def list_workflows(
    request: Request,
    project_id: str | None = Query(default=None, alias="projectId"),
) -> list[Workflow]:
    return _get_manager(request).list_workflows(project_id=project_id)


@router.get("/{workflow_id}", response_model=Workflow)
async def get_workflow(workflow_id: str, request: Request) -> Workflow:
    wf = _get_manager(request).get_workflow(workflow_id)
    if wf is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Workflow {workflow_id} not found")
    return wf


@router.get("/{workflow_id}/executions", response_model=list[WorkflowExecution])
async def list_executions(workflow_id: str, request: Request) -> list[WorkflowExecution]:
    return _get_manager(request).list_executions(workflow_id)


@router.post("/{workflow_id}/approval", response_model=Workflow)
async def signal_approval(
    workflow_id: str,
    decision: ApprovalDecisionRequest,
    request: Request,
) -> Workflow:
    patched = decision.model_copy(update={"workflow_id": workflow_id})
    wf = await _get_manager(request).signal_approval(patched)
    if wf is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Workflow {workflow_id} not found")
    return wf
