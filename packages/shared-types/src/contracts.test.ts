import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  AGENT_MEMORY_TYPES,
  AGENT_STATUSES,
  ARTIFACT_STATUSES,
  ARTIFACT_TYPES,
  CORTEX_EVENT_TYPES,
  DECISION_STATUSES,
  DEFAULT_ROLE_PERMISSIONS,
  ENTITY_TYPES,
  EVENT_DELIVERY_STATUSES,
  GRAPH_NODE_TYPES,
  KNOWLEDGE_ARTICLE_TYPES,
  MODEL_CAPABILITIES,
  NOTIFICATION_SEVERITIES,
  ORGANIZATION_PLANS,
  PROJECT_PHASES,
  PROJECT_STATUSES,
  PROVIDER_IDS,
  PROVIDER_TYPES,
  RELATIONSHIP_TYPES,
  REVIEW_TYPES,
  SEARCH_SOURCE_TYPES,
  SECURITY_ROLES,
  SOURCE_TYPES,
  STUDIO_IDS,
  STUDIO_STATUSES,
  TEMPORAL_NAMESPACES,
  TEMPORAL_TASK_QUEUES,
  TERMINAL_MODES,
  USER_STATUSES,
  WORK_REQUEST_PRIORITIES,
  WORK_REQUEST_STATUSES,
  WORK_RESPONSE_STATUSES,
  WORKFLOW_STATUSES,
  WORKFLOW_TYPES,
  WORKSPACE_MODES,
  WORKSPACE_STATES,
  isArtifactStatus,
  isArtifactType,
  isProjectPhase,
  isRelationshipType,
  isSecurityRole,
  isStudioId,
  isTerminalMode,
} from "./index";

function parsePythonEnums(pySource: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const classRegex = /class\s+(\w+)\(str,\s*Enum\):([\s\S]*?)(?=\nclass\s+|$)/g;
  const memberRegex = /^\s+[A-Z0-9_]+\s*=\s*"([^"]+)"/gm;

  for (const match of pySource.matchAll(classRegex)) {
    const className = match[1];
    const body = match[2];
    const values: string[] = [];
    for (const memberMatch of body.matchAll(memberRegex)) {
      values.push(memberMatch[1]);
    }
    result[className] = values;
  }
  return result;
}

test("runtime enum type guards validate canonical values and reject invalid ones", () => {
  assert.equal(isProjectPhase("discovery"), true);
  assert.equal(isProjectPhase("architecture"), true);
  assert.equal(isProjectPhase("invalid_phase"), false);

  assert.equal(isArtifactType("prd"), true);
  assert.equal(isArtifactType("database_schema"), true);
  assert.equal(isArtifactType("spreadsheet"), false);

  assert.equal(isArtifactStatus("approved"), true);
  assert.equal(isArtifactStatus("indexed"), true);
  assert.equal(isArtifactStatus("deleted"), false);

  assert.equal(isRelationshipType("IMPLEMENTS"), true);
  assert.equal(isRelationshipType("SUPERSEDES"), true);
  assert.equal(isRelationshipType("LIKES"), false);

  assert.equal(isStudioId("development"), true);
  assert.equal(isStudioId("jarvis"), false);

  assert.equal(isTerminalMode("execute"), true);
  assert.equal(isTerminalMode("agent"), true);
  assert.equal(isTerminalMode("messenger"), false);

  assert.equal(isSecurityRole("Owner"), true);
  assert.equal(isSecurityRole("Builder"), true);
  assert.equal(isSecurityRole("Guest"), false);
});

test("DEFAULT_ROLE_PERMISSIONS defines policies for every SecurityRole", () => {
  for (const role of SECURITY_ROLES) {
    assert.ok(
      Array.isArray(DEFAULT_ROLE_PERMISSIONS[role]) &&
        DEFAULT_ROLE_PERMISSIONS[role].length > 0,
      `Missing permissions for role ${role}`,
    );
  }
});

test("TypeScript and Python enum contracts maintain 1:1 parity", () => {
  const pyEnumsPath = path.resolve(
    process.cwd(),
    "packages/shared-types/python/cortexos_types/enums.py",
  );
  const pySource = fs.readFileSync(pyEnumsPath, "utf8");
  const pyEnums = parsePythonEnums(pySource);

  const expectedParity: Record<string, readonly string[]> = {
    ProjectStatus: PROJECT_STATUSES,
    ProjectPhase: PROJECT_PHASES,
    ArtifactStatus: ARTIFACT_STATUSES,
    ArtifactType: ARTIFACT_TYPES,
    EntityType: ENTITY_TYPES,
    SourceType: SOURCE_TYPES,
    KnowledgeArticleType: KNOWLEDGE_ARTICLE_TYPES,
    DecisionStatus: DECISION_STATUSES,
    StudioId: STUDIO_IDS,
    StudioStatus: STUDIO_STATUSES,
    AgentStatus: AGENT_STATUSES,
    AgentMemoryType: AGENT_MEMORY_TYPES,
    WorkRequestPriority: WORK_REQUEST_PRIORITIES,
    WorkRequestStatus: WORK_REQUEST_STATUSES,
    WorkResponseStatus: WORK_RESPONSE_STATUSES,
    GraphNodeType: GRAPH_NODE_TYPES,
    RelationshipType: RELATIONSHIP_TYPES,
    ProviderType: PROVIDER_TYPES,
    ProviderId: PROVIDER_IDS,
    ModelCapability: MODEL_CAPABILITIES,
    TerminalMode: TERMINAL_MODES,
    WorkspaceState: WORKSPACE_STATES,
    WorkspaceMode: WORKSPACE_MODES,
    WorkflowStatus: WORKFLOW_STATUSES,
    TemporalNamespace: TEMPORAL_NAMESPACES,
    TemporalTaskQueue: TEMPORAL_TASK_QUEUES,
    WorkflowType: WORKFLOW_TYPES,
    ReviewType: REVIEW_TYPES,
    CortexEventType: CORTEX_EVENT_TYPES,
    EventDeliveryStatus: EVENT_DELIVERY_STATUSES,
    SecurityRole: SECURITY_ROLES,
    UserStatus: USER_STATUSES,
    OrganizationPlan: ORGANIZATION_PLANS,
    SearchSourceType: SEARCH_SOURCE_TYPES,
    NotificationSeverity: NOTIFICATION_SEVERITIES,
  };

  for (const [pyName, tsValues] of Object.entries(expectedParity)) {
    assert.ok(pyEnums[pyName], `Missing Python enum ${pyName}`);
    assert.deepEqual(
      pyEnums[pyName],
      [...tsValues],
      `Enum mismatch for ${pyName}`,
    );
  }
});

test("Python models.__all__ exports all canonical domain and DTO contracts", () => {
  const pyModelsPath = path.resolve(
    process.cwd(),
    "packages/shared-types/python/cortexos_types/models.py",
  );
  const pyModelsSource = fs.readFileSync(pyModelsPath, "utf8");

  const requiredModels = [
    "BaseEntity",
    "BaseObject",
    "TenantScopedEntity",
    "User",
    "Organization",
    "Project",
    "CreateProjectRequest",
    "UpdateProjectRequest",
    "BaseArtifact",
    "Artifact",
    "ArtifactVersion",
    "CreateArtifactRequest",
    "Entity",
    "Concept",
    "Decision",
    "Pattern",
    "Doctrine",
    "Source",
    "KnowledgeArticle",
    "Relationship",
    "SearchDocument",
    "GraphNode",
    "GraphEdge",
    "GraphSubgraph",
    "KnowledgeQuery",
    "KnowledgeResult",
    "MainBrainContext",
    "StudioManifest",
    "Studio",
    "Agent",
    "AgentMemory",
    "AgentContext",
    "AgentResponse",
    "WorkRequest",
    "WorkResponse",
    "Provider",
    "ProviderCapability",
    "ModelDescriptor",
    "ModelRoutingRequest",
    "ModelRoutingDecision",
    "TerminalContextStack",
    "TerminalExecutionRecord",
    "Workflow",
    "WorkflowExecution",
    "AgentCouncilReport",
    "WarRoomSnapshot",
    "CortexEvent",
    "StoredEvent",
    "AuditLog",
    "PolicyEvaluationContext",
    "PolicyDecision",
    "AuthSession",
    "AgentDockItem",
    "Workspace",
    "TerminalSession",
    "SystemNotification",
  ];

  for (const modelName of requiredModels) {
    assert.ok(
      pyModelsSource.includes(`"${modelName}"`),
      `Missing ${modelName} in cortexos_types/models.py __all__`,
    );
  }
});
