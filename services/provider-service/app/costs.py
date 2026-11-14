from __future__ import annotations

import uuid
from datetime import datetime, timezone

from pydantic import Field

from cortexos_types import CortexModel, ModelDescriptor, ProviderUsageRecord


class UsageTotals(CortexModel):
    total_requests: int = 0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_cost_usd: float = 0.0
    by_provider: dict[str, float] = Field(default_factory=dict)
    by_studio: dict[str, float] = Field(default_factory=dict)
    records: list[ProviderUsageRecord] = Field(default_factory=list)


def calculate_cost_usd(
    *,
    model: ModelDescriptor | None,
    input_tokens: int,
    output_tokens: int,
) -> float:
    if model is None:
        return 0.0
    cost = (input_tokens / 1000.0) * model.cost_input + (
        output_tokens / 1000.0
    ) * model.cost_output
    return round(cost, 6)


class UsageTracker:
    """In-memory token & USD cost ledger across projects, studios, and providers."""

    def __init__(self) -> None:
        self._records: list[ProviderUsageRecord] = []

    def record(
        self,
        *,
        project_id: str | None,
        studio_id: str | None,
        provider: str,
        model_name: str,
        model_descriptor: ModelDescriptor | None,
        input_tokens: int,
        output_tokens: int,
        latency_ms: float,
    ) -> ProviderUsageRecord:
        cost_usd = calculate_cost_usd(
            model=model_descriptor,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
        entry = ProviderUsageRecord(
            id=f"usage-{uuid.uuid4().hex[:12]}",
            project_id=project_id or "global",
            studio_id=studio_id,
            provider=provider,
            model=model_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost_usd,
            latency_ms=latency_ms,
            recorded_at=datetime.now(timezone.utc),
        )
        self._records.append(entry)
        return entry

    def summarize(
        self,
        *,
        project_id: str | None = None,
        studio_id: str | None = None,
        provider: str | None = None,
    ) -> UsageTotals:
        filtered = [
            r
            for r in self._records
            if (project_id is None or r.project_id == project_id)
            and (studio_id is None or r.studio_id == studio_id)
            and (provider is None or r.provider == provider)
        ]
        by_provider: dict[str, float] = {}
        by_studio: dict[str, float] = {}
        total_in = 0
        total_out = 0
        total_cost = 0.0
        for rec in filtered:
            total_in += rec.input_tokens
            total_out += rec.output_tokens
            total_cost += rec.cost_usd
            by_provider[rec.provider] = round(
                by_provider.get(rec.provider, 0.0) + rec.cost_usd, 6
            )
            if rec.studio_id:
                by_studio[rec.studio_id] = round(
                    by_studio.get(rec.studio_id, 0.0) + rec.cost_usd, 6
                )
        return UsageTotals(
            total_requests=len(filtered),
            total_input_tokens=total_in,
            total_output_tokens=total_out,
            total_cost_usd=round(total_cost, 6),
            by_provider=by_provider,
            by_studio=by_studio,
            records=filtered,
        )
