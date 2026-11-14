import type { AgentStatus } from "../../shared-types/src";

export interface AgentContext {
  projectId: string;
  workspaceId: string;
  workRequestId: string;
  memoryIds: string[];
  artifactIds: string[];
  constraints: string[];
}

export interface AgentResponse {
  success: boolean;
  summary: string;
  artifactIds: string[];
  recommendations: string[];
  blockers: string[];
}

export interface CortexAgent {
  id: string;
  name: string;
  role: string;
  studioId: string;
  status: AgentStatus;
  plan(): Promise<void>;
  execute(): Promise<void>;
  validate(): Promise<void>;
  summarize(): Promise<void>;
  createArtifact(): Promise<void>;
  handoff(): Promise<void>;
}
