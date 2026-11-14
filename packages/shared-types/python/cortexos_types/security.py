from __future__ import annotations

from datetime import datetime

from .base import CortexModel
from .enums import SecurityRole


class PolicyEvaluationContext(CortexModel):
    subject_id: str
    organization_id: str
    role: SecurityRole
    resource: str
    action: str
    project_id: str | None = None


class PolicyDecision(CortexModel):
    allowed: bool
    reason: str | None = None
    matched_policy: str | None = None


class AuthSession(CortexModel):
    session_id: str
    user_id: str
    organization_id: str
    role: SecurityRole
    expires_at: datetime
    created_at: datetime


class RolePermissions(CortexModel):
    role: SecurityRole
    permissions: list[str]


DEFAULT_ROLE_PERMISSIONS: dict[SecurityRole, list[str]] = {
    SecurityRole.OWNER: ["*"],
    SecurityRole.ADMIN: [
        "project:*",
        "artifact:*",
        "knowledge:*",
        "studio:*",
        "workflow:*",
        "provider:*",
        "user:manage",
    ],
    SecurityRole.BUILDER: [
        "project:read",
        "project:write",
        "artifact:read",
        "artifact:write",
        "knowledge:read",
        "studio:execute",
        "workflow:start",
        "terminal:execute",
    ],
    SecurityRole.REVIEWER: [
        "project:read",
        "artifact:read",
        "artifact:review",
        "artifact:approve",
        "knowledge:read",
        "workflow:approve",
    ],
    SecurityRole.OBSERVER: [
        "project:read",
        "artifact:read",
        "knowledge:read",
        "workflow:read",
    ],
}
