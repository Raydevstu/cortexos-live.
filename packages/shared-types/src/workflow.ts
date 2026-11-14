import type { Artifact } from "./artifact";
import type { BaseEntity } from "./base";
import type {
  TemporalNamespace,
  TemporalTaskQueue,
  WorkflowStatus,
  WorkflowType,
} from "./enums";
import type { Agent } from "./agent";

export interface Workflow extends BaseEntity {
  organizationId?: string;
  projectId: string;
  workflowType: WorkflowType | string;
  namespace?: TemporalNamespace;
  taskQueue?: TemporalTaskQueue;
  status: WorkflowStatus | string;
  currentStep: string;
  startedAt: string;
  completedAt?: string | null;
  temporalRunId?: string | null;
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export interface WorkflowExecution extends BaseEntity {
  workflowId: string;
  executionId: string;
  status: WorkflowStatus | string;
  startedAt: string;
  completedAt?: string | null;
  retryCount: number;
  error?: string | null;
}

export interface WorkflowStartRequest {
  projectId: string;
  workflowType: WorkflowType;
  input: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface ApprovalDecisionRequest {
  workflowId: string;
  artifactId?: string;
  approved: boolean;
  decidedBy: string;
  feedback?: string;
}

export interface AgentCouncilOpinion {
  agentId: string;
  studioId: string;
  opinion: string;
  recommendation: string;
  risk: string;
  confidence: number;
}

export interface AgentCouncilReport {
  id: string;
  projectId: string;
  objective: string;
  opinions: AgentCouncilOpinion[];
  consensusSummary: string;
  decisions: string[];
  risks: string[];
  createdAt: string;
}

export interface WarRoomSnapshot {
  projectId: string;
  activeWorkflows: Workflow[];
  agents: Agent[];
  councilOpinions: AgentCouncilOpinion[];
  pendingApprovals: ApprovalDecisionRequest[];
  risks: string[];
  recentArtifacts: Artifact[];
  updatedAt: string;
}
