import type { CortexEvent, CortexEventType } from "../../shared-types/src/index.ts";

export interface ArtifactCreatedEvent extends CortexEvent {
  type: "artifact.created";
  artifactId: string;
  projectId: string;
}

export interface KnowledgeCreatedEvent extends CortexEvent {
  type: "knowledge.created";
  knowledgeId: string;
}

export interface AgentStartedEvent extends CortexEvent {
  type: "agent.started";
  agentId: string;
}

export interface AgentCompletedEvent extends CortexEvent {
  type: "agent.completed";
  agentId: string;
}

export interface AgentHandoffEvent extends CortexEvent {
  type: "agent.handoff";
  fromStudioId: string;
  toStudioId: string;
}

export interface WorkRequestCreatedEvent extends CortexEvent {
  type: "work_request.created";
  workRequestId: string;
  studioId: string;
}

export interface WorkRequestAssignedEvent extends CortexEvent {
  type: "work_request.assigned";
  workRequestId: string;
  studioId: string;
}

export interface WorkResponseReceivedEvent extends CortexEvent {
  type: "work_response.received";
  workRequestId: string;
  studioId: string;
}

export interface WorkflowStartedEvent extends CortexEvent {
  type: "workflow.started";
  workflowId: string;
  workflowType: string;
}

export interface WorkflowCompletedEvent extends CortexEvent {
  type: "workflow.completed";
  workflowId: string;
}

export interface WorkflowFailedEvent extends CortexEvent {
  type: "workflow.failed";
  workflowId: string;
  reason: string;
}

export interface ApprovalRequiredEvent extends CortexEvent {
  type: "approval.required";
  workflowId: string;
  artifactId: string;
}

export interface ApprovalDecidedEvent extends CortexEvent {
  type: "approval.decided";
  workflowId: string;
  approved: boolean;
  decidedBy: string;
}

export interface ProjectPhaseAdvancedEvent extends CortexEvent {
  type: "project.phase_advanced";
  fromPhase: string;
  toPhase: string;
}

export interface ProviderFailedEvent extends CortexEvent {
  type: "provider.failed";
  provider: string;
  reason: string;
}

export interface ProviderFailoverEvent extends CortexEvent {
  type: "provider.failover";
  failedProvider: string;
  fallbackProvider: string;
}

export interface TerminalCommandExecutedEvent extends CortexEvent {
  type: "terminal.command_executed";
  command: string;
  targetAgentId: string;
}

export interface ToolExecutedEvent extends CortexEvent {
  type: "tool.executed";
  executionId: string;
  toolName: string;
  agentId: string;
  studioId: string;
  artifactId?: string;
}

export interface ToolDeniedEvent extends CortexEvent {
  type: "tool.denied";
  executionId: string;
  toolName: string;
  agentId: string;
  reason: string;
}

export function buildCortexEvent<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
>(params: {
  type: CortexEventType | string;
  source: string;
  projectId?: string;
  correlationId?: string;
  organizationId?: string;
  idempotencyKey?: string;
  payload?: TPayload;
}): CortexEvent<TPayload> {
  const randomSuffix = Math.random().toString(16).slice(2, 10);
  return {
    id: `evt-${Date.now()}-${randomSuffix}`,
    type: params.type,
    timestamp: new Date().toISOString(),
    source: params.source,
    correlationId: params.correlationId,
    organizationId: params.organizationId ?? "org-cortex-default",
    projectId: params.projectId,
    idempotencyKey: params.idempotencyKey,
    payload: (params.payload ?? {}) as TPayload,
  };
}
