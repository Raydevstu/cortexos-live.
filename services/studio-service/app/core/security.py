from __future__ import annotations

from dataclasses import dataclass
from fnmatch import fnmatch

from fastapi import Depends, Header, HTTPException, status

from cortexos_types.enums import SecurityRole
from cortexos_types.security import (
    DEFAULT_ROLE_PERMISSIONS,
    PolicyDecision,
    PolicyEvaluationContext,
)

from .config import get_settings


@dataclass(frozen=True)
class RequestContext:
    subject_id: str
    organization_id: str
    role: SecurityRole


class PolicyEvaluator:
    def __init__(
        self,
        role_policies: dict[SecurityRole, list[str]] | None = None,
    ) -> None:
        self._policies = role_policies or DEFAULT_ROLE_PERMISSIONS

    def evaluate(self, ctx: PolicyEvaluationContext) -> PolicyDecision:
        role_key = SecurityRole(ctx.role)
        granted = self._policies.get(role_key, [])
        requested = f"{ctx.resource}:{ctx.action}"
        for pattern in granted:
            if pattern == "*" or fnmatch(requested, pattern):
                return PolicyDecision(
                    allowed=True,
                    matched_policy=f"{role_key.value}:{pattern}",
                )
        return PolicyDecision(
            allowed=False,
            reason=f"Role '{role_key.value}' lacks permission '{requested}'",
        )


_evaluator = PolicyEvaluator()


def get_policy_evaluator() -> PolicyEvaluator:
    return _evaluator


async def get_request_context(
    x_cortex_user_id: str | None = Header(default=None),
    x_cortex_org_id: str | None = Header(default=None),
    x_cortex_role: str | None = Header(default=None),
) -> RequestContext:
    settings = get_settings()
    if settings.enforce_auth and not x_cortex_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing caller identity header x-cortex-user-id",
        )
    role = SecurityRole.OWNER
    if x_cortex_role:
        try:
            role = SecurityRole(x_cortex_role)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Unsupported security role: {x_cortex_role}",
            ) from exc
    return RequestContext(
        subject_id=x_cortex_user_id or settings.default_actor_id,
        organization_id=x_cortex_org_id or settings.default_organization_id,
        role=role,
    )


def require_permission(resource: str, action: str):
    async def _dependency(
        ctx: RequestContext = Depends(get_request_context),
        evaluator: PolicyEvaluator = Depends(get_policy_evaluator),
    ) -> RequestContext:
        decision = evaluator.evaluate(
            PolicyEvaluationContext(
                subject_id=ctx.subject_id,
                organization_id=ctx.organization_id,
                role=ctx.role,
                resource=resource,
                action=action,
            )
        )
        if not decision.allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=decision.reason or "Permission denied",
            )
        return ctx

    return _dependency
