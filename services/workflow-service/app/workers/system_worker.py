from __future__ import annotations

from cortexos_types.enums import TemporalNamespace, TemporalTaskQueue

from app.activities.stubs import ALL_ACTIVITIES
from app.workflows import (
    AgentCouncilWorkflow,
    ApprovalWorkflow,
    ArchitectureWorkflow,
    DesignWorkflow,
    DevelopmentWorkflow,
    DiscoveryWorkflow,
    ProductWorkflow,
    ProjectLifecycleWorkflow,
    QAWorkflow,
    ReleaseWorkflow,
    WarRoomWorkflow,
    WorkRequestWorkflow,
)

NAMESPACE = TemporalNamespace.SYSTEM
TASK_QUEUE = TemporalTaskQueue.JARVIS_SYSTEM

REGISTERED_WORKFLOWS = [
    ProjectLifecycleWorkflow,
    DiscoveryWorkflow,
    ProductWorkflow,
    DesignWorkflow,
    ArchitectureWorkflow,
    DevelopmentWorkflow,
    QAWorkflow,
    ReleaseWorkflow,
    WorkRequestWorkflow,
    ApprovalWorkflow,
    WarRoomWorkflow,
    AgentCouncilWorkflow,
]

REGISTERED_ACTIVITIES = ALL_ACTIVITIES


def build_worker_spec() -> dict[str, object]:
    return {
        "namespace": NAMESPACE.value,
        "task_queue": TASK_QUEUE.value,
        "workflows": [cls.__name__ for cls in REGISTERED_WORKFLOWS],
        "activities": [getattr(fn, "__temporal_activity_name__", fn.__name__) for fn in REGISTERED_ACTIVITIES],
    }
