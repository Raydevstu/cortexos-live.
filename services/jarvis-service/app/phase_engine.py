from __future__ import annotations

from cortexos_types import WorkRequest
from cortexos_types.enums import ProjectPhase, StudioId, WorkRequestStatus

PHASE_ORDER: list[ProjectPhase] = [
    ProjectPhase.DISCOVERY,
    ProjectPhase.PRODUCT,
    ProjectPhase.DESIGN,
    ProjectPhase.ARCHITECTURE,
    ProjectPhase.DEVELOPMENT,
    ProjectPhase.QA,
    ProjectPhase.RELEASE,
    ProjectPhase.MAINTENANCE,
]

PHASE_TO_STUDIO: dict[ProjectPhase, StudioId] = {
    ProjectPhase.DISCOVERY: StudioId.DISCOVERY,
    ProjectPhase.PRODUCT: StudioId.PRODUCT,
    ProjectPhase.DESIGN: StudioId.DESIGN,
    ProjectPhase.ARCHITECTURE: StudioId.ARCHITECTURE,
    ProjectPhase.DEVELOPMENT: StudioId.DEVELOPMENT,
    ProjectPhase.QA: StudioId.QA,
    ProjectPhase.RELEASE: StudioId.RELEASE,
    ProjectPhase.MAINTENANCE: StudioId.RELEASE,
}


class PhaseEngine:
    """Enforces project lifecycle phase ordering, prerequisites, and feedback loops."""

    def index_of(self, phase: ProjectPhase) -> int:
        return PHASE_ORDER.index(phase)

    def next_phase(self, phase: ProjectPhase) -> ProjectPhase | None:
        idx = self.index_of(phase)
        if idx + 1 >= len(PHASE_ORDER):
            return None
        return PHASE_ORDER[idx + 1]

    def studio_for_phase(self, phase: ProjectPhase) -> StudioId:
        return PHASE_TO_STUDIO[phase]

    def evaluate_transition(
        self,
        *,
        current_phase: ProjectPhase,
        target_phase: ProjectPhase | None,
        work_requests: list[WorkRequest],
        pending_approval_count: int,
        blocked_reasons: list[str],
    ) -> tuple[bool, ProjectPhase, list[str]]:
        resolved_target = target_phase or self.next_phase(current_phase)
        if resolved_target is None:
            return False, current_phase, ["Project has already reached final maintenance phase."]

        cur_idx = self.index_of(current_phase)
        tgt_idx = self.index_of(resolved_target)

        # Allow feedback loops backwards (e.g., QA -> Development) without skip checks
        if tgt_idx < cur_idx:
            return True, resolved_target, []

        if tgt_idx == cur_idx:
            return False, current_phase, [f"Project is already in phase '{current_phase.value}'."]

        if tgt_idx > cur_idx + 1:
            return (
                False,
                current_phase,
                [
                    f"Cannot skip lifecycle phases ({current_phase.value} -> {resolved_target.value}). "
                    f"Next required phase is '{PHASE_ORDER[cur_idx + 1].value}'."
                ],
            )

        reasons: list[str] = list(blocked_reasons)
        if pending_approval_count > 0:
            reasons.append(f"{pending_approval_count} pending human approval gate(s) must be resolved.")

        unfinished = [
            wr
            for wr in work_requests
            if wr.status
            in (
                WorkRequestStatus.PENDING,
                WorkRequestStatus.QUEUED,
                WorkRequestStatus.ASSIGNED,
                WorkRequestStatus.EXECUTING,
                WorkRequestStatus.BLOCKED,
                WorkRequestStatus.FAILED,
            )
        ]
        if unfinished:
            reasons.append(
                f"{len(unfinished)} active/blocked work request(s) remain open in '{current_phase.value}'."
            )

        return len(reasons) == 0, resolved_target, reasons
