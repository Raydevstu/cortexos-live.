import type { BaseEntity } from "./base";
import type { AgentStatus } from "./enums";

export interface Studio extends BaseEntity {
  name: string;
  version: string;
  mission: string;
  enabled: boolean;
  status: "active" | "disabled" | "maintenance";
}

export interface Agent extends BaseEntity {
  studioId: string;
  name: string;
  role: string;
  status: AgentStatus;
  healthScore: number;
  currentTask: string;
  modelId?: string;
}

export interface WorkRequest extends BaseEntity {
  projectId: string;
  studioId: string;
  objective: string;
  constraints: string[];
  successCriteria: string[];
  contextArtifacts: string[];
  priority: "low" | "medium" | "high" | "critical";
}

export interface WorkResponse {
  id: string;
  requestId: string;
  studioId: string;
  status: "completed" | "failed" | "blocked";
  artifactIds: string[];
  summary: string;
  nextRecommendedPhase?: string;
}
