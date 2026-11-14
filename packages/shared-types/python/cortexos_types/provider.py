from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import Field

from .base import BaseEntity, CortexModel
from .enums import ModelCapability, ProviderId, ProviderType, TerminalMode


class Provider(BaseEntity):
    provider_id: ProviderId | str | None = None
    name: str
    type: ProviderType
    healthy: bool
    endpoint: str | None = None
    models_count: int | None = None


class ProviderCapability(CortexModel):
    chat: bool
    reasoning: bool
    coding: bool
    tools: bool
    files: bool
    vision: bool
    audio: bool | None = None
    agent: bool | None = None


class ModelDescriptor(CortexModel):
    provider: str
    model: str
    display_name: str
    capabilities: ProviderCapability
    context_window: int
    cost_input: float
    cost_output: float
    available: bool


class ProviderHealthStatus(CortexModel):
    provider: str
    healthy: bool
    latency_ms: float | None = None
    last_checked_at: datetime
    error: str | None = None


class ModelRoutingRequest(CortexModel):
    required_capabilities: list[ModelCapability]
    preferred_provider: str | None = None
    project_id: str | None = None
    studio_id: str | None = None
    max_cost_input: float | None = None
    allow_local_fallback: bool = True


class ModelRoutingDecision(CortexModel):
    provider: str
    model: str
    reason: str
    fallback_chain: list[str]
    estimated_cost_input: float
    estimated_cost_output: float


class ProviderUsageRecord(CortexModel):
    id: str
    project_id: str
    studio_id: str | None = None
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    latency_ms: float
    recorded_at: datetime


class TerminalContextStack(CortexModel):
    user_prompt: str
    project_context: str | None = None
    artifact_context: list[str] = Field(default_factory=list)
    memory_context: list[str] = Field(default_factory=list)
    knowledge_context: list[str] = Field(default_factory=list)
    studio_context: str | None = None


class ProviderGenerateRequest(CortexModel):
    provider: str | None = None
    model: str | None = None
    mode: TerminalMode
    prompt: str
    project_id: str | None = None
    studio_id: str | None = None
    required_capabilities: list[ModelCapability] = Field(default_factory=list)
    context_stack: TerminalContextStack | None = None
    tools: list[str] = Field(default_factory=list)
    temperature: float | None = None
    max_tokens: int | None = None


class ProviderUsageSummary(CortexModel):
    input_tokens: int
    output_tokens: int
    cost_usd: float


class ProviderGenerateResponse(CortexModel):
    request_id: str
    provider: str
    model: str
    output: str
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    artifact_ids: list[str] = Field(default_factory=list)
    usage: ProviderUsageSummary | None = None


class TerminalExecutionRecord(CortexModel):
    id: str
    session_id: str
    project_id: str
    command: str
    mode: TerminalMode
    provider: str
    model: str
    studio_id: str | None = None
    artifact_ids: list[str] = Field(default_factory=list)
    status: Literal["running", "completed", "failed", "cancelled"]
    output_summary: str | None = None
    started_at: datetime
    completed_at: datetime | None = None
