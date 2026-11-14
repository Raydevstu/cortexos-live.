from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from cortexos_types import CortexEvent
from cortexos_types.enums import CortexEventType


def build_event(
    *,
    event_type: CortexEventType | str,
    source: str,
    payload: dict[str, Any] | None = None,
    project_id: str | None = None,
    organization_id: str | None = None,
    correlation_id: str | None = None,
    idempotency_key: str | None = None,
) -> CortexEvent:
    etype = event_type.value if isinstance(event_type, CortexEventType) else str(event_type)
    return CortexEvent(
        id=f"evt-{uuid4().hex[:12]}",
        type=etype,
        timestamp=datetime.now(timezone.utc),
        source=source,
        correlation_id=correlation_id,
        organization_id=organization_id,
        project_id=project_id,
        idempotency_key=idempotency_key,
        payload=payload or {},
    )
