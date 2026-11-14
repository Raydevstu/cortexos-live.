from __future__ import annotations

from cortexos_types import Agent, WorkRequest
from cortexos_types.enums import AgentStatus, WorkRequestStatus

from app.schemas import PendingApprovalRecord, RiskAssessmentReport, RiskItem


class RiskEngine:
    """Continuously monitors agent health, blocked work, and gate risk across projects."""

    def assess(
        self,
        *,
        project_id: str,
        agents: list[Agent],
        work_requests: list[WorkRequest],
        pending_approvals: list[PendingApprovalRecord],
        provider_failures: int = 0,
    ) -> RiskAssessmentReport:
        risks: list[RiskItem] = []
        score = 0

        for wr in work_requests:
            if wr.status == WorkRequestStatus.BLOCKED:
                score += 25
                risks.append(
                    RiskItem(
                        id=f"risk-wr-{wr.id}",
                        severity="high",
                        category="work_request_blocked",
                        description=f"WorkRequest '{wr.objective}' ({wr.studio_id}) is blocked.",
                        mitigation="Escalate to Agent Council or re-route via Jarvis.",
                        source_entity_id=wr.id,
                    )
                )
            elif wr.status == WorkRequestStatus.FAILED:
                score += 30
                risks.append(
                    RiskItem(
                        id=f"risk-wr-{wr.id}",
                        severity="critical",
                        category="work_request_failed",
                        description=f"WorkRequest '{wr.objective}' ({wr.studio_id}) failed execution.",
                        mitigation="Trigger ProviderFailoverWorkflow or re-dispatch.",
                        source_entity_id=wr.id,
                    )
                )

        for agent in agents:
            if agent.status in (AgentStatus.BLOCKED, AgentStatus.FAILED):
                score += 20
                risks.append(
                    RiskItem(
                        id=f"risk-ag-{agent.id}",
                        severity="high",
                        category="agent_degraded",
                        description=f"Agent {agent.name} ({agent.studio_id}) is in '{agent.status.value}' state.",
                        mitigation="Inspect studio context stack and recover Temporal execution.",
                        source_entity_id=agent.id,
                    )
                )
            elif agent.health_score < 75:
                score += 15
                risks.append(
                    RiskItem(
                        id=f"risk-health-{agent.id}",
                        severity="medium",
                        category="agent_low_health",
                        description=f"Agent {agent.name} health dropped to {agent.health_score}%.",
                        mitigation="Route subsequent tasks to healthy backup model provider.",
                        source_entity_id=agent.id,
                    )
                )

        if pending_approvals:
            score += min(20, len(pending_approvals) * 8)
            risks.append(
                RiskItem(
                    id=f"risk-apr-{project_id}",
                    severity="medium",
                    category="approval_bottleneck",
                    description=f"{len(pending_approvals)} pending approval gate(s) blocking phase progression.",
                    mitigation="Review pending artifacts in War Room or Jarvis Workspace.",
                )
            )

        if provider_failures > 0:
            score += min(25, provider_failures * 10)
            risks.append(
                RiskItem(
                    id=f"risk-prov-{project_id}",
                    severity="high",
                    category="provider_failover",
                    description=f"Detected {provider_failures} recent provider failure(s) requiring failover.",
                    mitigation="Confirm fallback provider health in Provider Service.",
                )
            )

        bounded = min(100, score)
        status = "critical" if bounded >= 60 else "elevated" if bounded >= 25 else "nominal"
        return RiskAssessmentReport(
            project_id=project_id,
            risk_score=bounded,
            status=status,
            risks=risks,
        )
