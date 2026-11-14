from __future__ import annotations

from cortexos_types.enums import TemporalNamespace, TemporalTaskQueue

from app.activities.stubs import failover_provider_activity, route_provider_activity
from app.workflows import ProviderFailoverWorkflow, ProviderRoutingWorkflow

NAMESPACE = TemporalNamespace.PROVIDERS
TASK_QUEUE = TemporalTaskQueue.PROVIDER_RUNTIME

REGISTERED_WORKFLOWS = [
    ProviderRoutingWorkflow,
    ProviderFailoverWorkflow,
]

REGISTERED_ACTIVITIES = [
    route_provider_activity,
    failover_provider_activity,
]


def build_worker_spec() -> dict[str, object]:
    return {
        "namespace": NAMESPACE.value,
        "task_queue": TASK_QUEUE.value,
        "workflows": [cls.__name__ for cls in REGISTERED_WORKFLOWS],
        "activities": [getattr(fn, "__temporal_activity_name__", fn.__name__) for fn in REGISTERED_ACTIVITIES],
    }
