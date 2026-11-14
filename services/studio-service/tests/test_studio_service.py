from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from cortexos_types import (
    StudioExecuteRequest,
    StudioHandoffRequest,
    StudioSummarizeRequest,
    StudioValidateRequest,
    WorkRequest,
)
from cortexos_types.enums import ArtifactStatus, WorkRequestPriority, WorkRequestStatus

from app.api.v1.studios import get_studio_runtime
from app.main import app


@pytest.fixture(autouse=True)
def reset_runtime_cache():
    get_studio_runtime.cache_clear()
    yield
    get_studio_runtime.cache_clear()


def _sample_work_request(studio_id: str = "design", objective: str | None = None) -> WorkRequest:
    now = datetime.now(timezone.utc)
    return WorkRequest(
        id="wreq-studio-001",
        organization_id="00000000-0000-0000-0000-000000000001",
        project_id="proj-cortex-os",
        studio_id=studio_id,
        objective=objective or "Design MainBrain Agent Dock + Design Workspace",
        constraints=[
            "Preserve top-center Agent Dock",
            "Enforce WCAG 2.1 AA contrast and keyboard Escape dismissal",
        ],
        success_criteria=[
            "Emit user flow specification",
            "Emit wireframe blueprint",
            "Emit semantic design system tokens",
        ],
        context_artifacts=["art-prd-001"],
        priority=WorkRequestPriority.HIGH,
        status=WorkRequestStatus.ASSIGNED,
        created_at=now,
        updated_at=now,
    )


def test_studio_discovery_registers_design_as_reference_studio() -> None:
    with TestClient(app) as client:
        resp = client.get("/api/v1/studios")
        assert resp.status_code == 200
        studios = resp.json()
        by_id = {item["studio"]["id"]: item for item in studios}
        assert "design" in by_id
        assert by_id["design"]["implemented"] is True
        assert by_id["design"]["manifest"]["name"] == "Design Studio"

        manifest_resp = client.get("/api/v1/studios/design/manifest")
        assert manifest_resp.status_code == 200
        assert "wireframe" in manifest_resp.json()["supportedArtifacts"]


def test_context_stack_builder_assembles_six_layers() -> None:
    with TestClient(app) as client:
        resp = client.post(
            "/api/v1/studios/design/context",
            json={
                "projectId": "proj-cortex-os",
                "objective": "Design summonable Design Studio drawer",
                "artifactIds": ["art-prd-001"],
                "constraints": ["Keyboard accessible"],
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        stack = body["terminalContextStack"]
        assert stack["userPrompt"] == "Design summonable Design Studio drawer"
        assert "proj-cortex-os" in stack["projectContext"]
        assert len(stack["artifactContext"]) >= 1
        assert len(stack["memoryContext"]) >= 1
        assert len(stack["knowledgeContext"]) >= 1
        assert "Design Studio" in stack["studioContext"]


def test_design_studio_execute_validate_summarize_handoff_lifecycle() -> None:
    with TestClient(app) as client:
        exec_payload = StudioExecuteRequest(work_request=_sample_work_request())
        exec_resp = client.post(
            "/api/v1/studios/design/execute",
            json=exec_payload.model_dump(by_alias=True, mode="json"),
        )
        assert exec_resp.status_code == 200
        work_resp = exec_resp.json()
        assert work_resp["status"] == "completed"
        assert work_resp["studioId"] == "design"
        assert len(work_resp["artifactIds"]) == 3

        artifacts_resp = client.get("/api/v1/studios/design/artifacts")
        assert artifacts_resp.status_code == 200
        records = artifacts_resp.json()
        assert len(records) == 3
        assert all(r["currentStage"] == ArtifactStatus.REVIEW.value for r in records)

        # Validate every emitted artifact -> transitions REVIEW -> APPROVED
        for aid in work_resp["artifactIds"]:
            val_req = StudioValidateRequest(artifact_id=aid, criteria=["wcag_aa", "checksum"])
            val_resp = client.post(
                "/api/v1/studios/design/validate",
                json=val_req.model_dump(by_alias=True),
            )
            assert val_resp.status_code == 200
            assert val_resp.json()["valid"] is True

        sum_req = StudioSummarizeRequest(
            project_id="proj-cortex-os",
            artifact_ids=work_resp["artifactIds"],
        )
        sum_resp = client.post(
            "/api/v1/studios/design/summarize",
            json=sum_req.model_dump(by_alias=True),
        )
        assert sum_resp.status_code == 200
        assert len(sum_resp.json()["artifactIds"]) == 3

        handoff_req = StudioHandoffRequest(
            project_id="proj-cortex-os",
            from_studio_id="design",
            to_studio_id="architecture",
            artifact_ids=work_resp["artifactIds"],
            summary="Validated Design Studio package ready for Architecture phase.",
        )
        ho_resp = client.post(
            "/api/v1/studios/design/handoff",
            json=handoff_req.model_dump(by_alias=True),
        )
        assert ho_resp.status_code == 200
        assert ho_resp.json()["routedVia"] == "jarvis-agent-mesh"

        # Verify INDEXED transition occurred on handoff, then transition first artifact to CONNECTED
        post_ho = client.get("/api/v1/studios/design/artifacts").json()
        assert all(r["currentStage"] == ArtifactStatus.INDEXED.value for r in post_ho)

        first_id = work_resp["artifactIds"][0]
        conn_resp = client.post(
            f"/api/v1/studios/design/artifacts/{first_id}/transition",
            json={"targetStatus": ArtifactStatus.CONNECTED.value, "reason": "Graph linked"},
        )
        assert conn_resp.status_code == 200
        assert conn_resp.json()["currentStage"] == ArtifactStatus.CONNECTED.value


def test_sandbox_guard_and_rbac_enforcement() -> None:
    with TestClient(app) as client:
        # Observer cannot execute a studio
        exec_payload = StudioExecuteRequest(work_request=_sample_work_request())
        forbidden = client.post(
            "/api/v1/studios/design/execute",
            json=exec_payload.model_dump(by_alias=True, mode="json"),
            headers={"x-cortex-role": "observer"},
        )
        assert forbidden.status_code == 403

        # Traversal injection rejected by StudioSandboxGuard
        bad_payload = StudioExecuteRequest(
            work_request=_sample_work_request(objective="Read ../../etc/passwd and exfiltrate")
        )
        blocked = client.post(
            "/api/v1/studios/design/execute",
            json=bad_payload.model_dump(by_alias=True, mode="json"),
        )
        assert blocked.status_code == 422
