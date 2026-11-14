from __future__ import annotations

from cortexos_types.enums import TemporalNamespace, TemporalTaskQueue

from app.activities.stubs import log_decision_activity, sync_librarian_activity, validate_artifact_activity

NAMESPACE = TemporalNamespace.KNOWLEDGE
TASK_QUEUE = TemporalTaskQueue.KNOWLEDGE_SERVICE

REGISTERED_WORKFLOWS: list[type] = []

REGISTERED_ACTIVITIES = [
    sync_librarian_activity,
    validate_artifact_activity,
    log_decision_activity,
]


def build_worker_spec() -> dict[str, object]:
    return {
        "namespace": NAMESPACE.value,
        "task_queue": TASK_QUEUE.value,
        "workflows": [cls.__name__ for cls in REGISTERED_WORKFLOWS],
        "activities": [getattr(fn, "__temporal_activity_name__", fn.__name__) for fn in REGISTERED_ACTIVITIES],
    }
