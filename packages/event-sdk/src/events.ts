import type { CortexEvent } from "../../shared-types/src";

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

export interface ProviderFailedEvent extends CortexEvent {
  type: "provider.failed";
  provider: string;
  reason: string;
}

export interface WorkflowCompletedEvent extends CortexEvent {
  type: "workflow.completed";
  workflowId: string;
}
