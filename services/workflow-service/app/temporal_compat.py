from __future__ import annotations

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, Callable, TypeVar

F = TypeVar("F", bound=Callable[..., Any])
T = TypeVar("T", bound=type)

try:
    from temporalio import activity as _temporal_activity
    from temporalio import workflow as _temporal_workflow
    from temporalio.client import Client as TemporalClient
    from temporalio.common import RetryPolicy
    from temporalio.worker import Worker as TemporalWorker

    TEMPORAL_SDK_AVAILABLE = True
except ImportError:  # pragma: no cover - static inspection / minimal container fallback
    TEMPORAL_SDK_AVAILABLE = False
    TemporalClient = None  # type: ignore[assignment,misc]
    TemporalWorker = None  # type: ignore[assignment,misc]

    @dataclass(frozen=True)
    class RetryPolicy:  # type: ignore[no-redef]
        initial_interval: timedelta = field(default_factory=lambda: timedelta(seconds=1))
        backoff_coefficient: float = 2.0
        maximum_interval: timedelta = field(default_factory=lambda: timedelta(seconds=30))
        maximum_attempts: int = 3

    class _FallbackWorkflowNamespace:
        @staticmethod
        def defn(cls_or_name: T | str | None = None, *, name: str | None = None, sandboxed: bool = True) -> Any:
            if isinstance(cls_or_name, type):
                setattr(cls_or_name, "__temporal_workflow_name__", name or cls_or_name.__name__)
                setattr(cls_or_name, "__temporal_sandboxed__", sandboxed)
                return cls_or_name

            def decorator(cls: T) -> T:
                wf_name = name or (cls_or_name if isinstance(cls_or_name, str) else cls.__name__)
                setattr(cls, "__temporal_workflow_name__", wf_name)
                setattr(cls, "__temporal_sandboxed__", sandboxed)
                return cls

            return decorator

        @staticmethod
        def run(fn: F) -> F:
            setattr(fn, "__temporal_workflow_run__", True)
            return fn

        @staticmethod
        def signal(fn: F | None = None, *, name: str | None = None) -> Any:
            def decorator(target: F) -> F:
                setattr(target, "__temporal_workflow_signal__", name or target.__name__)
                return target

            return decorator(fn) if fn is not None else decorator

        @staticmethod
        def query(fn: F | None = None, *, name: str | None = None) -> Any:
            def decorator(target: F) -> F:
                setattr(target, "__temporal_workflow_query__", name or target.__name__)
                return target

            return decorator(fn) if fn is not None else decorator

        @staticmethod
        async def execute_activity(
            activity_fn: Callable[..., Any],
            *args: Any,
            start_to_close_timeout: timedelta | None = None,
            retry_policy: RetryPolicy | None = None,
            **kwargs: Any,
        ) -> Any:
            _ = (start_to_close_timeout, retry_policy)
            return await activity_fn(*args, **kwargs)

        @staticmethod
        async def execute_child_workflow(
            workflow_cls: type[Any],
            arg: Any = None,
            *,
            id: str | None = None,
            task_queue: str | None = None,
        ) -> Any:
            _ = (id, task_queue)
            instance = workflow_cls()
            if arg is None:
                return await instance.run()
            return await instance.run(arg)

        @staticmethod
        async def wait_condition(fn: Callable[[], bool], timeout: timedelta | None = None) -> None:
            _ = timeout
            if not fn():
                raise TimeoutError("Temporal wait_condition predicate did not become truthy.")

    class _FallbackActivityNamespace:
        @staticmethod
        def defn(fn_or_name: F | str | None = None, *, name: str | None = None) -> Any:
            if callable(fn_or_name):
                setattr(fn_or_name, "__temporal_activity_name__", name or fn_or_name.__name__)
                return fn_or_name

            def decorator(fn: F) -> F:
                act_name = name or (fn_or_name if isinstance(fn_or_name, str) else fn.__name__)
                setattr(fn, "__temporal_activity_name__", act_name)
                return fn

            return decorator

    _temporal_workflow = _FallbackWorkflowNamespace()  # type: ignore[assignment]
    _temporal_activity = _FallbackActivityNamespace()  # type: ignore[assignment]


workflow = _temporal_workflow
activity = _temporal_activity
