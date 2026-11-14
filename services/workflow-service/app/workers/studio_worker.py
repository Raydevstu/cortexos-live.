from __future__ import annotations

from cortexos_types.enums import TemporalNamespace, TemporalTaskQueue

from app.activities.stubs import (
    dispatch_work_request_activity,
    execute_studio_activity,
    log_decision_activity,
    sync_librarian_activity,
    validate_artifact_activity,
)
from app.workflows import AgentExecutionWorkflow, ArtifactReviewWorkflow

NAMESPACE = TemporalNamespace.STUDIOS
TASK_QUEUE = TemporalTaskQueue.STUDIO_RUNTIME

REGISTERED_WORKFLOWS = [
    AgentExecutionWorkflow,
    ArtifactReviewWorkflow,
]

REGISTERED_ACTIVITIES = [
    dispatch_work_request_activity,
    execute_studio_activity,
    validate_artifact_activity,
    sync_librarian_activity,
    log_decision_activity,
]


def build_worker_spec() -> dict[str, object]:
    return {
        "namespace": NAMESPACE.value,
        "task_queue": TASK_QUEUE.value,
        "workflows": [cls.__name__ for cls in REGISTERED_WORKFLOWS],
        "activities": [getattr(fn, "__temporal_activity_name__", fn.__name__) for fn in REGISTERED_ACTIVITIES],
    }
