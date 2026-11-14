export const PROJECT_STATUSES = [
  "draft",
  "active",
  "paused",
  "blocked",
  "completed",
  "archived",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_PHASES = [
  "discovery",
  "product",
  "design",
  "architecture",
  "development",
  "qa",
  "release",
  "maintenance",
] as const;
export type ProjectPhase = (typeof PROJECT_PHASES)[number];

export const ARTIFACT_STATUSES = [
  "draft",
  "review",
  "approved",
  "indexed",
  "connected",
  "archived",
] as const;
export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];

export const ARTIFACT_TYPES = [
  "research",
  "persona",
  "prd",
  "roadmap",
  "requirement",
  "wireframe",
  "ui_design",
  "design_system",
  "architecture",
  "openapi",
  "database_schema",
  "infrastructure",
  "source_code",
  "integration",
  "test_plan",
  "security_report",
  "release_plan",
  "deployment",
  "release_notes",
  "doctrine",
  "pattern",
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ENTITY_TYPES = [
  "company",
  "technology",
  "framework",
  "platform",
  "provider",
  "repository",
  "service",
  "database",
  "infrastructure",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const SOURCE_TYPES = [
  "pdf",
  "url",
  "repo",
  "meeting",
  "chat",
  "video",
  "document",
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const KNOWLEDGE_ARTICLE_TYPES = [
  "entity",
  "concept",
  "pattern",
  "doctrine",
  "project",
  "decision",
  "summary",
  "playbook",
] as const;
export type KnowledgeArticleType = (typeof KNOWLEDGE_ARTICLE_TYPES)[number];

export const DECISION_STATUSES = [
  "proposed",
  "accepted",
  "superseded",
  "rejected",
  "deprecated",
] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const STUDIO_IDS = [
  "discovery",
  "product",
  "design",
  "architecture",
  "development",
  "qa",
  "release",
] as const;
export type StudioId = (typeof STUDIO_IDS)[number];

export const STUDIO_STATUSES = [
  "active",
  "disabled",
  "maintenance",
] as const;
export type StudioStatus = (typeof STUDIO_STATUSES)[number];

export const AGENT_STATUSES = [
  "idle",
  "planning",
  "executing",
  "waiting",
  "reviewing",
  "blocked",
  "completed",
  "failed",
] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const AGENT_MEMORY_TYPES = [
  "episodic",
  "semantic",
  "procedural",
  "lesson",
  "pattern",
  "constraint",
] as const;
export type AgentMemoryType = (typeof AGENT_MEMORY_TYPES)[number];

export const WORK_REQUEST_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type WorkRequestPriority = (typeof WORK_REQUEST_PRIORITIES)[number];

export const WORK_REQUEST_STATUSES = [
  "pending",
  "queued",
  "assigned",
  "executing",
  "review",
  "approved",
  "completed",
  "failed",
  "blocked",
  "archived",
] as const;
export type WorkRequestStatus = (typeof WORK_REQUEST_STATUSES)[number];

export const WORK_RESPONSE_STATUSES = [
  "completed",
  "failed",
  "blocked",
] as const;
export type WorkResponseStatus = (typeof WORK_RESPONSE_STATUSES)[number];

export const GRAPH_NODE_TYPES = [
  "Project",
  "Artifact",
  "Decision",
  "Entity",
  "Concept",
  "Pattern",
  "Doctrine",
  "Studio",
  "Agent",
  "Workflow",
] as const;
export type GraphNodeType = (typeof GRAPH_NODE_TYPES)[number];

export const RELATIONSHIP_TYPES = [
  "CONTAINS",
  "REFERENCES",
  "USES",
  "DEPENDS_ON",
  "CREATED_BY",
  "IMPLEMENTS",
  "DERIVED_FROM",
  "INFLUENCES",
  "PART_OF",
  "SUPERSEDES",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const PROVIDER_TYPES = [
  "cloud",
  "local",
  "enterprise",
] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

export const PROVIDER_IDS = [
  "openai",
  "anthropic",
  "gemini",
  "grok",
  "deepseek",
  "openrouter",
  "ollama",
  "lmstudio",
  "azure_openai",
  "vertex_ai",
  "bedrock",
  "vllm",
  "localai",
] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const MODEL_CAPABILITIES = [
  "chat",
  "reasoning",
  "coding",
  "tools",
  "files",
  "vision",
  "audio",
  "agent_tasks",
] as const;
export type ModelCapability = (typeof MODEL_CAPABILITIES)[number];

export const TERMINAL_MODES = [
  "chat",
  "build",
  "research",
  "execute",
  "agent",
] as const;
export type TerminalMode = (typeof TERMINAL_MODES)[number];

export const WORKSPACE_STATES = [
  "open",
  "closed",
  "pinned",
] as const;
export type WorkspaceState = (typeof WORKSPACE_STATES)[number];

export const WORKSPACE_MODES = [
  "floating",
  "docked",
  "fullscreen",
  "pinned",
] as const;
export type WorkspaceMode = (typeof WORKSPACE_MODES)[number];

export const WORKFLOW_STATUSES = [
  "pending",
  "running",
  "waiting_approval",
  "completed",
  "failed",
  "cancelled",
  "timed_out",
  "rolled_back",
] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const TEMPORAL_NAMESPACES = [
  "system",
  "projects",
  "knowledge",
  "studios",
  "providers",
] as const;
export type TemporalNamespace = (typeof TEMPORAL_NAMESPACES)[number];

export const TEMPORAL_TASK_QUEUES = [
  "jarvis-system",
  "knowledge-service",
  "studio-runtime",
  "provider-runtime",
] as const;
export type TemporalTaskQueue = (typeof TEMPORAL_TASK_QUEUES)[number];

export const WORKFLOW_TYPES = [
  "ProjectLifecycleWorkflow",
  "DiscoveryWorkflow",
  "ProductWorkflow",
  "DesignWorkflow",
  "ArchitectureWorkflow",
  "DevelopmentWorkflow",
  "QAWorkflow",
  "ReleaseWorkflow",
  "AgentExecutionWorkflow",
  "WorkRequestWorkflow",
  "ArtifactLifecycleWorkflow",
  "LibrarianIngestionWorkflow",
  "KnowledgeCompoundingWorkflow",
  "MainBrainSyncWorkflow",
  "ProviderRoutingWorkflow",
  "ProviderFailoverWorkflow",
  "AgentMemoryWorkflow",
  "WarRoomWorkflow",
  "ApprovalWorkflow",
  "ArtifactReviewWorkflow",
  "AgentCouncilWorkflow",
] as const;
export type WorkflowType = (typeof WORKFLOW_TYPES)[number];

export const REVIEW_TYPES = [
  "design",
  "architecture",
  "code",
  "qa",
  "release",
] as const;
export type ReviewType = (typeof REVIEW_TYPES)[number];

export const CORTEX_EVENT_TYPES = [
  "project.created",
  "project.phase_advanced",
  "project.updated",
  "artifact.created",
  "artifact.updated",
  "artifact.reviewed",
  "artifact.approved",
  "artifact.indexed",
  "artifact.connected",
  "artifact.archived",
  "knowledge.created",
  "knowledge.updated",
  "knowledge.compounded",
  "doctrine.proposed",
  "doctrine.approved",
  "agent.started",
  "agent.completed",
  "agent.failed",
  "agent.blocked",
  "agent.handoff",
  "work_request.created",
  "work_request.assigned",
  "work_response.received",
  "workflow.started",
  "workflow.completed",
  "workflow.failed",
  "approval.required",
  "approval.decided",
  "provider.failed",
  "provider.failover",
  "terminal.command_executed",
] as const;
export type CortexEventType = (typeof CORTEX_EVENT_TYPES)[number];

export const EVENT_DELIVERY_STATUSES = [
  "pending",
  "published",
  "processed",
  "failed",
  "dead_letter",
] as const;
export type EventDeliveryStatus = (typeof EVENT_DELIVERY_STATUSES)[number];

export const SECURITY_ROLES = [
  "Owner",
  "Admin",
  "Builder",
  "Reviewer",
  "Observer",
] as const;
export type SecurityRole = (typeof SECURITY_ROLES)[number];

export const USER_STATUSES = [
  "active",
  "invited",
  "suspended",
  "disabled",
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const ORGANIZATION_PLANS = [
  "free",
  "pro",
  "team",
  "enterprise",
] as const;
export type OrganizationPlan = (typeof ORGANIZATION_PLANS)[number];

export const SEARCH_SOURCE_TYPES = [
  "artifact",
  "entity",
  "concept",
  "decision",
  "pattern",
  "doctrine",
  "knowledge_article",
  "source",
] as const;
export type SearchSourceType = (typeof SEARCH_SOURCE_TYPES)[number];

export const NOTIFICATION_SEVERITIES = [
  "info",
  "success",
  "warning",
  "error",
  "action_required",
] as const;
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];

export function isProjectPhase(value: string): value is ProjectPhase {
  return (PROJECT_PHASES as readonly string[]).includes(value);
}

export function isArtifactType(value: string): value is ArtifactType {
  return (ARTIFACT_TYPES as readonly string[]).includes(value);
}

export function isArtifactStatus(value: string): value is ArtifactStatus {
  return (ARTIFACT_STATUSES as readonly string[]).includes(value);
}

export function isRelationshipType(value: string): value is RelationshipType {
  return (RELATIONSHIP_TYPES as readonly string[]).includes(value);
}

export function isStudioId(value: string): value is StudioId {
  return (STUDIO_IDS as readonly string[]).includes(value);
}

export function isTerminalMode(value: string): value is TerminalMode {
  return (TERMINAL_MODES as readonly string[]).includes(value);
}

export function isSecurityRole(value: string): value is SecurityRole {
  return (SECURITY_ROLES as readonly string[]).includes(value);
}
