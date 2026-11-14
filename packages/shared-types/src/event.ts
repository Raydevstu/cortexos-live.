import type { CortexEventType, EventDeliveryStatus } from "./enums";

export interface CortexEvent<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string;
  type: CortexEventType | string;
  timestamp: string;
  source: string;
  correlationId?: string;
  organizationId?: string;
  projectId?: string;
  idempotencyKey?: string;
  payload: TPayload;
}

export interface ArtifactCreatedEventPayload extends Record<string, unknown> {
  artifactId: string;
  projectId: string;
  artifactType: string;
}

export interface KnowledgeCreatedEventPayload extends Record<string, unknown> {
  knowledgeId: string;
  knowledgeType: string;
}

export interface AgentLifecycleEventPayload extends Record<string, unknown> {
  agentId: string;
  studioId?: string;
  workRequestId?: string;
}

export interface WorkflowCompletedEventPayload extends Record<string, unknown> {
  workflowId: string;
  workflowType: string;
  projectId: string;
}

export interface ProviderFailedEventPayload extends Record<string, unknown> {
  provider: string;
  model?: string;
  reason: string;
  fallbackProvider?: string;
}

export interface ApprovalRequiredEventPayload extends Record<string, unknown> {
  workflowId: string;
  artifactId: string;
  projectId: string;
  requestedBy: string;
}

export interface StoredEvent {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: EventDeliveryStatus;
  timestamp: string;
  attempts?: number;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changedBy: string;
  createdAt: string;
  changes?: Record<string, unknown>;
}
