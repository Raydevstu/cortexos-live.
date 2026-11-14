from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.db import get_db_session
from app.main import create_app
from app.models import Base


@pytest.fixture
async def client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    app = create_app()

    async def override_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db_session] = override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    await engine.dispose()


@pytest.mark.asyncio
async def test_project_and_artifact_lifecycle(client: AsyncClient) -> None:
    proj_res = await client.post(
        "/api/v1/projects",
        json={"name": "Solar CRM", "description": "CRM platform for solar installers"},
    )
    assert proj_res.status_code == 201
    proj_data = proj_res.json()
    project_id = proj_data["id"]
    assert proj_data["status"] == "draft"
    assert proj_data["phase"] == "discovery"

    art_res = await client.post(
        "/api/v1/artifacts",
        json={
            "projectId": project_id,
            "title": "Solar CRM Architecture",
            "artifactType": "architecture",
            "content": "# Architecture\nFastAPI + Postgres + Neo4j",
        },
    )
    assert art_res.status_code == 201
    artifact_id = art_res.json()["id"]

    # Missing approved_by & approved_at must return 422
    bad_approve = await client.patch(
        f"/api/v1/artifacts/{artifact_id}",
        json={"status": "approved"},
    )
    assert bad_approve.status_code == 422

    # Proper approval succeeds and records outbox/audit
    good_approve = await client.patch(
        f"/api/v1/artifacts/{artifact_id}",
        json={
            "status": "approved",
            "approvedBy": "00000000-0000-0000-0000-000000000002",
            "approvedAt": "2026-11-14T18:00:00Z",
        },
    )
    assert good_approve.status_code == 200
    assert good_approve.json()["status"] == "approved"

    # Outbox events must contain project.created, artifact.created, artifact.approved
    events_res = await client.get("/api/v1/events")
    assert events_res.status_code == 200
    event_types = {e["eventType"] for e in events_res.json()}
    assert "project.created" in event_types
    assert "artifact.created" in event_types
    assert "artifact.approved" in event_types


@pytest.mark.asyncio
async def test_relationship_self_loop_rejected_and_rbac_enforced(
    client: AsyncClient,
) -> None:
    self_loop = await client.post(
        "/api/v1/relationships",
        json={
            "sourceId": "00000000-0000-0000-0000-000000000010",
            "targetId": "00000000-0000-0000-0000-000000000010",
            "relationshipType": "USES",
        },
    )
    assert self_loop.status_code == 422

    forbidden = await client.post(
        "/api/v1/projects",
        headers={"x-cortex-role": "Observer"},
        json={"name": "Unauthorized", "description": "Should fail RBAC"},
    )
    assert forbidden.status_code == 403
