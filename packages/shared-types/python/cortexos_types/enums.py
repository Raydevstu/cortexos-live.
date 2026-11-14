from __future__ import annotations

from enum import Enum


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ProjectPhase(str, Enum):
    DISCOVERY = "discovery"
    PRODUCT = "product"
    DESIGN = "design"
    ARCHITECTURE = "architecture"
    DEVELOPMENT = "development"
    QA = "qa"
    RELEASE = "release"
    MAINTENANCE = "maintenance"


class ArtifactStatus(str, Enum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    INDEXED = "indexed"
    CONNECTED = "connected"
    ARCHIVED = "archived"


class ArtifactType(str, Enum):
    RESEARCH = "research"
    PERSONA = "persona"
    PRD = "prd"
    ROADMAP = "roadmap"
    REQUIREMENT = "requirement"
    WIREFRAME = "wireframe"
    UI_DESIGN = "ui_design"
    DESIGN_SYSTEM = "design_system"
    ARCHITECTURE = "architecture"
    OPENAPI = "openapi"
    DATABASE_SCHEMA = "database_schema"
    INFRASTRUCTURE = "infrastructure"
    SOURCE_CODE = "source_code"
    INTEGRATION = "integration"
    TEST_PLAN = "test_plan"
    SECURITY_REPORT = "security_report"
    RELEASE_PLAN = "release_plan"
    DEPLOYMENT = "deployment"
    RELEASE_NOTES = "release_notes"
    DOCTRINE = "doctrine"
    PATTERN = "pattern"


class EntityType(str, Enum):
    COMPANY = "company"
    TECHNOLOGY = "technology"
    FRAMEWORK = "framework"
    PLATFORM = "platform"
    PROVIDER = "provider"
    REPOSITORY = "repository"
    SERVICE = "service"
    DATABASE = "database"
    INFRASTRUCTURE = "infrastructure"


class SourceType(str, Enum):
    PDF = "pdf"
    URL = "url"
    REPO = "repo"
    MEETING = "meeting"
    CHAT = "chat"
    VIDEO = "video"
    DOCUMENT = "document"


class KnowledgeArticleType(str, Enum):
    ENTITY = "entity"
    CONCEPT = "concept"
    PATTERN = "pattern"
    DOCTRINE = "doctrine"
    PROJECT = "project"
    DECISION = "decision"
    SUMMARY = "summary"
    PLAYBOOK = "playbook"


class DecisionStatus(str, Enum):
    PROPOSED = "proposed"
    ACCEPTED = "accepted"
    SUPERSEDED = "superseded"
    REJECTED = "rejected"
    DEPRECATED = "deprecated"


class StudioId(str, Enum):
    DISCOVERY = "discovery"
    PRODUCT = "product"
    DESIGN = "design"
    ARCHITECTURE = "architecture"
    DEVELOPMENT = "development"
    QA = "qa"
    RELEASE = "release"


class StudioStatus(str, Enum):
    ACTIVE = "active"
    DISABLED = "disabled"
    MAINTENANCE = "maintenance"


class AgentStatus(str, Enum):
    IDLE = "idle"
    PLANNING = "planning"
    EXECUTING = "executing"
    WAITING = "waiting"
    REVIEWING = "reviewing"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentMemoryType(str, Enum):
    EPISODIC = "episodic"
    SEMANTIC = "semantic"
    PROCEDURAL = "procedural"
    LESSON = "lesson"
    PATTERN = "pattern"
    CONSTRAINT = "constraint"


class WorkRequestPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class WorkRequestStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    ASSIGNED = "assigned"
    EXECUTING = "executing"
    REVIEW = "review"
    APPROVED = "approved"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"
    ARCHIVED = "archived"


class WorkResponseStatus(str, Enum):
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"


class GraphNodeType(str, Enum):
    PROJECT = "Project"
    ARTIFACT = "Artifact"
    DECISION = "Decision"
    ENTITY = "Entity"
    CONCEPT = "Concept"
    PATTERN = "Pattern"
    DOCTRINE = "Doctrine"
    STUDIO = "Studio"
    AGENT = "Agent"
    WORKFLOW = "Workflow"


class RelationshipType(str, Enum):
    CONTAINS = "CONTAINS"
    REFERENCES = "REFERENCES"
    USES = "USES"
    DEPENDS_ON = "DEPENDS_ON"
    CREATED_BY = "CREATED_BY"
    IMPLEMENTS = "IMPLEMENTS"
    DERIVED_FROM = "DERIVED_FROM"
    INFLUENCES = "INFLUENCES"
    PART_OF = "PART_OF"
    SUPERSEDES = "SUPERSEDES"


class ProviderType(str, Enum):
    CLOUD = "cloud"
    LOCAL = "local"
    ENTERPRISE = "enterprise"


class ProviderId(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"
    GROK = "grok"
    DEEPSEEK = "deepseek"
    OPENROUTER = "openrouter"
    OLLAMA = "ollama"
    LMSTUDIO = "lmstudio"
    AZURE_OPENAI = "azure_openai"
    VERTEX_AI = "vertex_ai"
    BEDROCK = "bedrock"
    VLLM = "vllm"
    LOCALAI = "localai"


class ModelCapability(str, Enum):
    CHAT = "chat"
    REASONING = "reasoning"
    CODING = "coding"
    TOOLS = "tools"
    FILES = "files"
    VISION = "vision"
    AUDIO = "audio"
    AGENT_TASKS = "agent_tasks"


class TerminalMode(str, Enum):
    CHAT = "chat"
    BUILD = "build"
    RESEARCH = "research"
    EXECUTE = "execute"
    AGENT = "agent"


class WorkspaceState(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    PINNED = "pinned"


class WorkspaceMode(str, Enum):
    FLOATING = "floating"
    DOCKED = "docked"
    FULLSCREEN = "fullscreen"
    PINNED = "pinned"


class WorkflowStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    WAITING_APPROVAL = "waiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"
    ROLLED_BACK = "rolled_back"


class TemporalNamespace(str, Enum):
    SYSTEM = "system"
    PROJECTS = "projects"
    KNOWLEDGE = "knowledge"
    STUDIOS = "studios"
    PROVIDERS = "providers"


class TemporalTaskQueue(str, Enum):
    JARVIS_SYSTEM = "jarvis-system"
    KNOWLEDGE_SERVICE = "knowledge-service"
    STUDIO_RUNTIME = "studio-runtime"
    PROVIDER_RUNTIME = "provider-runtime"


class WorkflowType(str, Enum):
    PROJECT_LIFECYCLE = "ProjectLifecycleWorkflow"
    DISCOVERY = "DiscoveryWorkflow"
    PRODUCT = "ProductWorkflow"
    DESIGN = "DesignWorkflow"
    ARCHITECTURE = "ArchitectureWorkflow"
    DEVELOPMENT = "DevelopmentWorkflow"
    QA = "QAWorkflow"
    RELEASE = "ReleaseWorkflow"
    AGENT_EXECUTION = "AgentExecutionWorkflow"
    WORK_REQUEST = "WorkRequestWorkflow"
    ARTIFACT_LIFECYCLE = "ArtifactLifecycleWorkflow"
    LIBRARIAN_INGESTION = "LibrarianIngestionWorkflow"
    KNOWLEDGE_COMPOUNDING = "KnowledgeCompoundingWorkflow"
    MAINBRAIN_SYNC = "MainBrainSyncWorkflow"
    PROVIDER_ROUTING = "ProviderRoutingWorkflow"
    PROVIDER_FAILOVER = "ProviderFailoverWorkflow"
    AGENT_MEMORY = "AgentMemoryWorkflow"
    WAR_ROOM = "WarRoomWorkflow"
    APPROVAL = "ApprovalWorkflow"
    ARTIFACT_REVIEW = "ArtifactReviewWorkflow"
    AGENT_COUNCIL = "AgentCouncilWorkflow"


class ReviewType(str, Enum):
    DESIGN = "design"
    ARCHITECTURE = "architecture"
    CODE = "code"
    QA = "qa"
    RELEASE = "release"


class CortexEventType(str, Enum):
    PROJECT_CREATED = "project.created"
    PROJECT_PHASE_ADVANCED = "project.phase_advanced"
    PROJECT_UPDATED = "project.updated"
    ARTIFACT_CREATED = "artifact.created"
    ARTIFACT_UPDATED = "artifact.updated"
    ARTIFACT_REVIEWED = "artifact.reviewed"
    ARTIFACT_APPROVED = "artifact.approved"
    ARTIFACT_INDEXED = "artifact.indexed"
    ARTIFACT_CONNECTED = "artifact.connected"
    ARTIFACT_ARCHIVED = "artifact.archived"
    KNOWLEDGE_CREATED = "knowledge.created"
    KNOWLEDGE_UPDATED = "knowledge.updated"
    KNOWLEDGE_COMPOUNDED = "knowledge.compounded"
    DOCTRINE_PROPOSED = "doctrine.proposed"
    DOCTRINE_APPROVED = "doctrine.approved"
    AGENT_STARTED = "agent.started"
    AGENT_COMPLETED = "agent.completed"
    AGENT_FAILED = "agent.failed"
    AGENT_BLOCKED = "agent.blocked"
    AGENT_HANDOFF = "agent.handoff"
    WORK_REQUEST_CREATED = "work_request.created"
    WORK_REQUEST_ASSIGNED = "work_request.assigned"
    WORK_RESPONSE_RECEIVED = "work_response.received"
    WORKFLOW_STARTED = "workflow.started"
    WORKFLOW_COMPLETED = "workflow.completed"
    WORKFLOW_FAILED = "workflow.failed"
    APPROVAL_REQUIRED = "approval.required"
    APPROVAL_DECIDED = "approval.decided"
    PROVIDER_FAILED = "provider.failed"
    PROVIDER_FAILOVER = "provider.failover"
    TERMINAL_COMMAND_EXECUTED = "terminal.command_executed"


class EventDeliveryStatus(str, Enum):
    PENDING = "pending"
    PUBLISHED = "published"
    PROCESSED = "processed"
    FAILED = "failed"
    DEAD_LETTER = "dead_letter"


class SecurityRole(str, Enum):
    OWNER = "Owner"
    ADMIN = "Admin"
    BUILDER = "Builder"
    REVIEWER = "Reviewer"
    OBSERVER = "Observer"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INVITED = "invited"
    SUSPENDED = "suspended"
    DISABLED = "disabled"


class OrganizationPlan(str, Enum):
    FREE = "free"
    PRO = "pro"
    TEAM = "team"
    ENTERPRISE = "enterprise"


class SearchSourceType(str, Enum):
    ARTIFACT = "artifact"
    ENTITY = "entity"
    CONCEPT = "concept"
    DECISION = "decision"
    PATTERN = "pattern"
    DOCTRINE = "doctrine"
    KNOWLEDGE_ARTICLE = "knowledge_article"
    SOURCE = "source"


class NotificationSeverity(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    ACTION_REQUIRED = "action_required"
