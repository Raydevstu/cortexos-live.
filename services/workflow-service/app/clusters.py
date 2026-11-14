from __future__ import annotations

from dataclasses import dataclass

from cortexos_types.enums import TemporalNamespace, TemporalTaskQueue, WorkflowType


@dataclass(frozen=True)
class TemporalClusterSpec:
    namespace: TemporalNamespace
    task_queue: TemporalTaskQueue
    retention_days: int
    description: str
    workflows: tuple[WorkflowType, ...]


TEMPORAL_CLUSTER_TOPOLOGY: dict[TemporalTaskQueue, TemporalClusterSpec] = {
    TemporalTaskQueue.JARVIS_SYSTEM: TemporalClusterSpec(
        namespace=TemporalNamespace.SYSTEM,
        task_queue=TemporalTaskQueue.JARVIS_SYSTEM,
        retention_days=30,
        description="Jarvis supervisor, project lifecycle, phase advancement, work request routing, approvals, war room, and council workflows.",
        workflows=(
            WorkflowType.PROJECT_LIFECYCLE,
            WorkflowType.WORK_REQUEST,
            WorkflowType.APPROVAL,
            WorkflowType.WAR_ROOM,
            WorkflowType.AGENT_COUNCIL,
            WorkflowType.DISCOVERY,
            WorkflowType.PRODUCT,
            WorkflowType.DESIGN,
            WorkflowType.ARCHITECTURE,
            WorkflowType.DEVELOPMENT,
            WorkflowType.QA,
            WorkflowType.RELEASE,
        ),
    ),
    TemporalTaskQueue.STUDIO_RUNTIME: TemporalClusterSpec(
        namespace=TemporalNamespace.STUDIOS,
        task_queue=TemporalTaskQueue.STUDIO_RUNTIME,
        retention_days=14,
        description="Studio agent execution, artifact creation/review, and multi-studio handoffs.",
        workflows=(
            WorkflowType.AGENT_EXECUTION,
            WorkflowType.ARTIFACT_REVIEW,
            WorkflowType.ARTIFACT_LIFECYCLE,
        ),
    ),
    TemporalTaskQueue.KNOWLEDGE_SERVICE: TemporalClusterSpec(
        namespace=TemporalNamespace.KNOWLEDGE,
        task_queue=TemporalTaskQueue.KNOWLEDGE_SERVICE,
        retention_days=30,
        description="Librarian ingestion, knowledge compounding, MainBrain graph/search synchronization.",
        workflows=(
            WorkflowType.LIBRARIAN_INGESTION,
            WorkflowType.KNOWLEDGE_COMPOUNDING,
            WorkflowType.MAINBRAIN_SYNC,
        ),
    ),
    TemporalTaskQueue.PROVIDER_RUNTIME: TemporalClusterSpec(
        namespace=TemporalNamespace.PROVIDERS,
        task_queue=TemporalTaskQueue.PROVIDER_RUNTIME,
        retention_days=7,
        description="Provider routing, health checks, failover escalation, and token accounting.",
        workflows=(
            WorkflowType.PROVIDER_ROUTING,
            WorkflowType.PROVIDER_FAILOVER,
        ),
    ),
}

WORKFLOW_ROUTING_MAP: dict[WorkflowType, tuple[TemporalNamespace, TemporalTaskQueue]] = {
    wf_type: (spec.namespace, spec.task_queue)
    for spec in TEMPORAL_CLUSTER_TOPOLOGY.values()
    for wf_type in spec.workflows
}


def resolve_route(workflow_type: WorkflowType) -> tuple[TemporalNamespace, TemporalTaskQueue]:
    return WORKFLOW_ROUTING_MAP.get(
        workflow_type,
        (TemporalNamespace.SYSTEM, TemporalTaskQueue.JARVIS_SYSTEM),
    )
