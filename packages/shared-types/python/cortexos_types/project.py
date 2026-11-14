from __future__ import annotations

from typing import Any

from pydantic import Field

from .base import BaseEntity, CortexModel, TenantScopedEntity
from .enums import OrganizationPlan, ProjectPhase, ProjectStatus, SecurityRole, UserStatus


class User(BaseEntity):
    email: str
    name: str
    avatar_url: str | None = None
    role: SecurityRole
    status: UserStatus
    preferences: dict[str, Any] = Field(default_factory=dict)


class Organization(BaseEntity):
    name: str
    slug: str
    plan: OrganizationPlan
    settings: dict[str, Any] = Field(default_factory=dict)


class Project(TenantScopedEntity):
    name: str
    description: str
    status: ProjectStatus
    phase: ProjectPhase
    owner_id: str
    vision: str | None = None


class CreateProjectRequest(CortexModel):
    organization_id: str | None = None
    name: str
    description: str
    vision: str | None = None
    phase: ProjectPhase | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class CreateProjectResponse(CortexModel):
    id: str
    status: ProjectStatus
    phase: ProjectPhase
    project: Project | None = None


class UpdateProjectRequest(CortexModel):
    name: str | None = None
    description: str | None = None
    status: ProjectStatus | None = None
    phase: ProjectPhase | None = None
    vision: str | None = None
    tags: list[str] | None = None
    metadata: dict[str, Any] | None = None


class ProjectSummary(CortexModel):
    project: Project
    artifact_count: int
    decision_count: int
    active_workflow_count: int
    active_agent_count: int
