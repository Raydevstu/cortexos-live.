from __future__ import annotations

from datetime import datetime, timezone

from cortexos_types import Agent, JarvisProjectState, WorkRequest
from cortexos_types.enums import AgentStatus, ProjectPhase, ProjectStatus, WorkRequestStatus

from app.phase_engine import PhaseEngine


class ProjectStateEngine:
    """Maintains authoritative live JarvisProjectState and per-agent runtime telemetry."""

    def __init__(self, phase_engine: PhaseEngine) -> None:
        self._phase_engine = phase_engine
        self._project_phases: dict[str, ProjectPhase] = {}
        self._project_statuses: dict[str, ProjectStatus] = {}
        self._work_requests: dict[str, list[WorkRequest]] = {}
        self._agents: dict[str, Agent] = {}
        self._agent_meta: dict[str, dict[str, str]] = {}
        self._seed_default_agents()

    def _seed_default_agents(self) -> None:
        now = datetime.now(timezone.utc)
        seeds = [
            ("jarvis", "jarvis", "Jarvis", "OS Supervisor", AgentStatus.IDLE, 99, "claude-sonnet-4", "anthropic"),
            ("librarian", "librarian", "Librarian", "Knowledge Steward", AgentStatus.IDLE, 98, "gemini-2.5-pro", "gemini"),
            ("discovery", "discovery", "Discovery", "Research Strategist", AgentStatus.IDLE, 97, "gemini-2.5-pro", "gemini"),
            ("product", "product", "Product", "Product Lead", AgentStatus.IDLE, 99, "gpt-4.1", "openai"),
            ("design", "design", "Design", "Experience Architect", AgentStatus.EXECUTING, 99, "claude-sonnet-4", "anthropic"),
            ("architecture", "architecture", "Architecture", "Systems Architect", AgentStatus.IDLE, 96, "deepseek-reasoner", "deepseek"),
            ("development", "development", "Development", "Principal Engineer", AgentStatus.IDLE, 98, "claude-sonnet-4", "anthropic"),
            ("qa", "qa", "QA", "Verification Lead", AgentStatus.IDLE, 95, "qwen2.5-coder:14b", "ollama"),
            ("release", "release", "Release", "Release Commander", AgentStatus.IDLE, 100, "openrouter/auto", "openrouter"),
        ]
        for aid, studio_id, name, role, status, health, model_id, provider in seeds:
            self._agents[aid] = Agent(
                id=aid,
                studio_id=studio_id,
                name=name,
                role=role,
                status=status,
                health_score=health,
                current_task="Standing by for Jarvis WorkRequest",
                model_id=model_id,
                created_at=now,
                updated_at=now,
            )
            self._agent_meta[aid] = {
                "current_artifact": "",
                "current_workflow": "",
                "provider": provider,
                "runtime_state": status.value,
                "last_decision": "Runtime initialized",
            }

    def ensure_project(self, project_id: str, initial_phase: ProjectPhase = ProjectPhase.DESIGN) -> None:
        if project_id not in self._project_phases:
            self._project_phases[project_id] = initial_phase
        if project_id not in self._project_statuses:
            self._project_statuses[project_id] = ProjectStatus.ACTIVE
        if project_id not in self._work_requests:
            self._work_requests[project_id] = []

    def get_phase(self, project_id: str) -> ProjectPhase:
        self.ensure_project(project_id)
        return self._project_phases[project_id]

    def set_phase(self, project_id: str, phase: ProjectPhase) -> None:
        self.ensure_project(project_id)
        self._project_phases[project_id] = phase

    def add_work_request(self, wr: WorkRequest) -> None:
        self.ensure_project(wr.project_id)
        existing = self._work_requests[wr.project_id]
        self._work_requests[wr.project_id] = [wr, *[item for item in existing if item.id != wr.id]]

    def update_work_request_status(self, project_id: str, wr_id: str, status: WorkRequestStatus) -> None:
        self.ensure_project(project_id)
        self._work_requests[project_id] = [
            wr.model_copy(update={"status": status, "updated_at": datetime.now(timezone.utc)})
            if wr.id == wr_id
            else wr
            for wr in self._work_requests[project_id]
        ]

    def update_agent_runtime(
        self,
        agent_id: str,
        *,
        status: AgentStatus | None = None,
        current_task: str | None = None,
        current_artifact: str | None = None,
        current_workflow: str | None = None,
        provider: str | None = None,
        model_id: str | None = None,
        last_decision: str | None = None,
        health_score: int | None = None,
    ) -> Agent | None:
        agent = self._agents.get(agent_id)
        if agent is None:
            return None
        updates: dict[str, object] = {"updated_at": datetime.now(timezone.utc)}
        if status is not None:
            updates["status"] = status
        if current_task is not None:
            updates["current_task"] = current_task
        if model_id is not None:
            updates["model_id"] = model_id
        if health_score is not None:
            updates["health_score"] = health_score
        updated = agent.model_copy(update=updates)
        self._agents[agent_id] = updated

        meta = self._agent_meta.setdefault(agent_id, {})
        if status is not None:
            meta["runtime_state"] = status.value
        if current_artifact is not None:
            meta["current_artifact"] = current_artifact
        if current_workflow is not None:
            meta["current_workflow"] = current_workflow
        if provider is not None:
            meta["provider"] = provider
        if last_decision is not None:
            meta["last_decision"] = last_decision
        return updated

    def list_agents(self) -> list[Agent]:
        return list(self._agents.values())

    def get_agent_meta(self, agent_id: str) -> dict[str, str]:
        return dict(self._agent_meta.get(agent_id, {}))

    def list_work_requests(self, project_id: str) -> list[WorkRequest]:
        self.ensure_project(project_id)
        return list(self._work_requests[project_id])

    def build_project_state(
        self,
        *,
        project_id: str,
        pending_approval_count: int,
    ) -> JarvisProjectState:
        self.ensure_project(project_id)
        phase = self._project_phases[project_id]
        work_requests = self._work_requests[project_id]
        agents = list(self._agents.values())

        blocked_reasons: list[str] = []
        for wr in work_requests:
            if wr.status in (WorkRequestStatus.BLOCKED, WorkRequestStatus.FAILED):
                blocked_reasons.append(f"WorkRequest {wr.id} ({wr.studio_id}) is {wr.status.value}.")
        for agent in agents:
            if agent.status in (AgentStatus.BLOCKED, AgentStatus.FAILED):
                blocked_reasons.append(f"Agent {agent.name} is {agent.status.value}.")

        ready, next_p, gate_reasons = self._phase_engine.evaluate_transition(
            current_phase=phase,
            target_phase=None,
            work_requests=work_requests,
            pending_approval_count=pending_approval_count,
            blocked_reasons=blocked_reasons,
        )
        return JarvisProjectState(
            project_id=project_id,
            phase=phase,
            status="blocked" if blocked_reasons else self._project_statuses[project_id].value,
            active_work_requests=work_requests,
            active_agents=agents,
            blocked_reasons=gate_reasons if not ready else [],
            ready_for_next_phase=ready,
            next_phase=next_p if next_p != phase else None,
        )
