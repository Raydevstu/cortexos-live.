from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from cortexos_types import ModelRoutingRequest, ProviderGenerateRequest
from cortexos_types.enums import ModelCapability, TerminalMode

from app.costs import UsageTracker
from app.failover import FailoverExecutor
from app.main import app
from app.registry import ProviderRegistry
from app.router import CapabilityRouter


@pytest.mark.asyncio
async def test_registry_has_all_required_providers_and_routes_by_capability() -> None:
    registry = ProviderRegistry()
    providers = await registry.list_providers()
    ids = {p.provider_id.value if hasattr(p.provider_id, "value") else p.provider_id for p in providers}
    for required in {
        "openai",
        "anthropic",
        "gemini",
        "grok",
        "deepseek",
        "openrouter",
        "ollama",
        "lmstudio",
    }:
        assert required in ids

    cap_router = CapabilityRouter(registry)
    decision = await cap_router.route(
        ModelRoutingRequest(
            required_capabilities=[ModelCapability.VISION, ModelCapability.CODING],
            preferred_provider="anthropic",
        )
    )
    assert decision.provider == "anthropic"
    assert decision.model == "claude-sonnet-4-5"
    assert len(decision.fallback_chain) >= 2


@pytest.mark.asyncio
async def test_automatic_failover_and_cost_tracking() -> None:
    registry = ProviderRegistry()
    cap_router = CapabilityRouter(registry)
    tracker = UsageTracker()
    executor = FailoverExecutor(
        registry=registry,
        router=cap_router,
        usage_tracker=tracker,
    )

    # Force primary OpenAI failure right during execution to verify live failover
    openai_adapter = registry.get_adapter("openai")
    assert openai_adapter is not None
    openai_adapter.set_simulated_failure("simulated 503 upstream timeout")

    res = await executor.generate_with_failover(
        ProviderGenerateRequest(
            provider="openai",
            model="gpt-5",
            mode=TerminalMode.BUILD,
            prompt="Generate design system token architecture for Design Studio",
            project_id="proj-1",
            studio_id="design",
            required_capabilities=[ModelCapability.CHAT, ModelCapability.CODING],
        )
    )
    assert res.provider != "openai"
    assert res.usage is not None
    assert res.usage.input_tokens > 0
    assert res.usage.output_tokens > 0
    assert res.usage.cost_usd >= 0.0

    assert registry.is_healthy("openai") is False
    totals = tracker.summarize(project_id="proj-1", studio_id="design")
    assert totals.total_requests == 1
    assert totals.total_input_tokens == res.usage.input_tokens


def test_provider_routes_and_rbac_enforcement() -> None:
    client = TestClient(app)
    assert client.get("/health").status_code == 200

    observer_headers = {
        "x-cortex-user-id": "obs-1",
        "x-cortex-org-id": "org-1",
        "x-cortex-role": "Observer",
    }
    builder_headers = {
        "x-cortex-user-id": "bld-1",
        "x-cortex-org-id": "org-1",
        "x-cortex-role": "Builder",
    }

    assert client.get("/api/v1/providers", headers=observer_headers).status_code == 200
    assert client.get("/api/v1/providers/health", headers=observer_headers).status_code == 200
    assert client.get("/api/v1/providers/gemini/models", headers=observer_headers).status_code == 200

    # Observer lacks terminal:execute permission
    denied = client.post(
        "/api/v1/providers/generate",
        json={"mode": "chat", "prompt": "Hello"},
        headers=observer_headers,
    )
    assert denied.status_code == 403

    generated = client.post(
        "/api/v1/providers/generate",
        json={
            "mode": "build",
            "prompt": "Create wireframe spec",
            "projectId": "proj-ui",
            "studioId": "design",
            "requiredCapabilities": ["chat", "vision"],
        },
        headers=builder_headers,
    )
    assert generated.status_code == 200
    assert generated.json()["usage"]["inputTokens"] > 0

    usage = client.get(
        "/api/v1/providers/usage",
        params={"project_id": "proj-ui"},
        headers=observer_headers,
    )
    assert usage.status_code == 200
    assert usage.json()["totalRequests"] >= 1
