from __future__ import annotations

from datetime import datetime, timezone

import pytest

from cortexos_agents import CortexAgent
from cortexos_types import WorkRequest
from cortexos_types.enums import AgentStatus, WorkRequestPriority, WorkResponseStatus

from design_agent import DesignAgent
from design_studio import CortexDesignStudio, compute_contrast_ratio


@pytest.mark.asyncio
async def test_python_design_studio_and_cortex_agent_lifecycle() -> None:
    studio = CortexDesignStudio()
    await studio.initialize()
    assert studio.manifest.id == "design"
    assert isinstance(studio.agent, CortexAgent)
    assert isinstance(studio.agent, DesignAgent)
    assert len(studio.local_memory) >= 4

    now = datetime.now(timezone.utc)
    req = WorkRequest(
        id="wreq-py-001",
        project_id="proj-cortex-01",
        studio_id="design",
        objective="Design MainBrain Agent Dock and Wireframe System",
        constraints=["Preserve Agent Dock + MainBrain + Terminal Sandbox layout"],
        success_criteria=["Emit flows, wireframes, and design tokens"],
        context_artifacts=[],
        priority=WorkRequestPriority.HIGH,
        created_at=now,
        updated_at=now,
    )

    resp = await studio.execute(req)
    assert resp.status == WorkResponseStatus.COMPLETED
    assert len(resp.artifact_ids) == 3
    assert resp.next_recommended_phase == "architecture"
    assert studio.agent.status == AgentStatus.COMPLETED


@pytest.mark.asyncio
async def test_python_design_studio_blocks_low_contrast_palette() -> None:
    assert compute_contrast_ratio("#94A3B8", "#FFFFFF") < 4.5
    studio = CortexDesignStudio(
        palette={
            "surface_canvas": "#FFFFFF",
            "surface_elevated": "#F8FAFC",
            "ink_primary": "#94A3B8",
            "ink_secondary": "#CBD5E1",
            "accent_primary": "#38BDF8",
            "ink_on_accent": "#FFFFFF",
            "border_focus": "#E2E8F0",
        }
    )
    now = datetime.now(timezone.utc)
    req = WorkRequest(
        id="wreq-py-002",
        project_id="proj-cortex-01",
        studio_id="design",
        objective="Design bright theme tokens",
        priority=WorkRequestPriority.MEDIUM,
        created_at=now,
        updated_at=now,
    )

    resp = await studio.execute(req)
    assert resp.status == WorkResponseStatus.BLOCKED
    assert "Contrast failure" in resp.summary
