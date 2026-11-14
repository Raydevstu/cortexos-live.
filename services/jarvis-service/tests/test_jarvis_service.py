from __future__ import annotations

import asyncio
import pytest
from fastapi.testclient import TestClient

from cortexos_types import CreateWorkRequest, StudioHandoffRequest
from cortexos_types.enums import ProjectPhase, WorkRequestPriority

from app.api.v1.jarvis import get_jarvis_engine
from app.main import app
from app.mesh import DirectStudioMessagingViolation


@pytest.fixture(autouse=True)
def reset_engine():
    get_jarvis_engine.cache_clear()
    yield
    get_jarvis_engine.cache_clear()


def test_jarvis_state_work_request_dispatch_and_phase_advance() -> None:
    with TestClient(app) as client:
        state_resp = client.get("/api/v1/jarvis/state/proj-solar-crm")
        assert state_resp.status_code == 200
        assert state_resp.json()["phase"] == "design"

        wr_payload = CreateWorkRequest(
            project_id="proj-solar-crm",
            studio_id="auto",
            objective="Generate WCAG 2.1 AA wireframes for Agent Dock drawer",
            priority=WorkRequestPriority.HIGH,
        )
        disp = client.post(
            "/api/v1/jarvis/work-requests",
            json=wr_payload.model_dump(by_alias=True, mode="json"),
        )
        assert disp.status_code == 201
        body = disp.json()
        assert body["assignment"]["studioId"] == "design"
        assert body["workResponse"]["status"] == "completed"
        assert len(body["events"]) >= 3

        adv = client.post(
            "/api/v1/jarvis/phase/advance",
            json={
                "projectId": "proj-solar-crm",
                "targetPhase": ProjectPhase.ARCHITECTURE.value,
                "notes": "Design deliverables approved",
            },
        )
        assert adv.status_code == 200
        assert adv.json()["phase"] == "architecture"


def test_jarvis_blocks_direct_studio_messaging_and_phase_skipping() -> None:
    engine = get_jarvis_engine()
    with pytest.raises(DirectStudioMessagingViolation):
        asyncio.run(
            engine.mesh_controller.route_message(
                project_id="proj-solar-crm",
                from_agent="design",
                to_agent="development",
                summary="Attempt bypass",
                routed_via_jarvis=False,
            )
        )

    with TestClient(app) as client:
        skip = client.post(
            "/api/v1/jarvis/phase/advance",
            json={
                "projectId": "proj-solar-crm",
                "targetPhase": ProjectPhase.RELEASE.value,
            },
        )
        assert skip.status_code == 422


def test_council_handoff_approvals_and_risk_engine() -> None:
    with TestClient(app) as client:
        council_resp = client.post(
            "/api/v1/jarvis/council",
            json={
                "projectId": "proj-solar-crm",
                "objective": "Approve Sprint 5 Jarvis + Temporal WebSocket integration",
            },
        )
        assert council_resp.status_code == 200
        assert len(council_resp.json()["opinions"]) == 7

        handoff_req = StudioHandoffRequest(
            project_id="proj-solar-crm",
            from_studio_id="design",
            to_studio_id="architecture",
            artifact_ids=["art-ds-904a"],
            summary="Tokens verified at 100% WCAG AA.",
        )
        ho_resp = client.post(
            "/api/v1/jarvis/handoff",
            json=handoff_req.model_dump(by_alias=True),
        )
        assert ho_resp.status_code == 200
        assert ho_resp.json()["viaJarvis"] is True

        risks = client.get("/api/v1/jarvis/risks/proj-solar-crm")
        assert risks.status_code == 200
        assert risks.json()["status"] == "nominal"
