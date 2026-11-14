from cortexos_types.enums import WorkflowType

from .agent_execution import AgentExecutionWorkflow
from .approval import ApprovalWorkflow
from .council import AgentCouncilWorkflow
from .phases import (
    ArchitectureWorkflow,
    DesignWorkflow,
    DevelopmentWorkflow,
    DiscoveryWorkflow,
    ProductWorkflow,
    QAWorkflow,
    ReleaseWorkflow,
)
from .project_lifecycle import ProjectLifecycleWorkflow
from .provider_routing import ProviderFailoverWorkflow, ProviderRoutingWorkflow
from .review import ArtifactReviewWorkflow
from .war_room import WarRoomWorkflow
from .work_request import WorkRequestWorkflow

WORKFLOW_REGISTRY: dict[WorkflowType, type] = {
    WorkflowType.PROJECT_LIFECYCLE: ProjectLifecycleWorkflow,
    WorkflowType.DISCOVERY: DiscoveryWorkflow,
    WorkflowType.PRODUCT: ProductWorkflow,
    WorkflowType.DESIGN: DesignWorkflow,
    WorkflowType.ARCHITECTURE: ArchitectureWorkflow,
    WorkflowType.DEVELOPMENT: DevelopmentWorkflow,
    WorkflowType.QA: QAWorkflow,
    WorkflowType.RELEASE: ReleaseWorkflow,
    WorkflowType.WORK_REQUEST: WorkRequestWorkflow,
    WorkflowType.AGENT_EXECUTION: AgentExecutionWorkflow,
    WorkflowType.APPROVAL: ApprovalWorkflow,
    WorkflowType.ARTIFACT_REVIEW: ArtifactReviewWorkflow,
    WorkflowType.WAR_ROOM: WarRoomWorkflow,
    WorkflowType.AGENT_COUNCIL: AgentCouncilWorkflow,
    WorkflowType.PROVIDER_ROUTING: ProviderRoutingWorkflow,
    WorkflowType.PROVIDER_FAILOVER: ProviderFailoverWorkflow,
}

__all__ = [
    "WORKFLOW_REGISTRY",
    "ProjectLifecycleWorkflow",
    "DiscoveryWorkflow",
    "ProductWorkflow",
    "DesignWorkflow",
    "ArchitectureWorkflow",
    "DevelopmentWorkflow",
    "QAWorkflow",
    "ReleaseWorkflow",
    "WorkRequestWorkflow",
    "AgentExecutionWorkflow",
    "ApprovalWorkflow",
    "ArtifactReviewWorkflow",
    "WarRoomWorkflow",
    "AgentCouncilWorkflow",
    "ProviderRoutingWorkflow",
    "ProviderFailoverWorkflow",
]
