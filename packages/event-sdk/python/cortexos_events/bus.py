from __future__ import annotations

from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Protocol

from cortexos_types import CortexEvent
from cortexos_types.enums import CortexEventType

EventHandler = Callable[[CortexEvent], Awaitable[None]]


class EventBus(Protocol):
    async def publish(self, event: CortexEvent) -> None: ...

    def subscribe(
        self, event_type: CortexEventType | str, handler: EventHandler
    ) -> None: ...


class InMemoryEventBus:
    """Async EventBus implementation with idempotency dedup and wildcard '*' listeners."""

    def __init__(self, max_history: int = 500) -> None:
        self._handlers: dict[str, list[EventHandler]] = defaultdict(list)
        self._history: list[CortexEvent] = []
        self._seen_idempotency: set[str] = set()
        self._max_history = max_history

    def subscribe(
        self, event_type: CortexEventType | str, handler: EventHandler
    ) -> None:
        key = (
            event_type.value
            if isinstance(event_type, CortexEventType)
            else str(event_type)
        )
        self._handlers[key].append(handler)

    async def publish(self, event: CortexEvent) -> None:
        if event.idempotency_key:
            if event.idempotency_key in self._seen_idempotency:
                return
            self._seen_idempotency.add(event.idempotency_key)

        self._history.insert(0, event)
        if len(self._history) > self._max_history:
            self._history = self._history[: self._max_history]

        key = (
            event.type.value
            if isinstance(event.type, CortexEventType)
            else str(event.type)
        )
        for handler in [*self._handlers.get(key, []), *self._handlers.get("*", [])]:
            await handler(event)

    def recent_events(self, limit: int = 50) -> list[CortexEvent]:
        return self._history[:limit]
