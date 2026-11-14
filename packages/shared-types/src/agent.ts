import type { BaseEntity } from "./base";
import type {
  AgentMemoryType,
  AgentStatus,
  ArtifactType,
  ProjectPhase,
  StudioStatus,
  WorkRequestPriority,
  WorkRequestStatus,
  WorkResponseStatus,
} from "./enums";

export interface StudioManifest {
  id: string;
  name: string;
  version: string;
  mission: string;
  capabilities: string[];
  supportedArtifacts: (ArtifactType | string)[];
  tools: string[];
  constraints: string[];
}

export interface Studio extends BaseEntity {
  name: string;
  version: string;
  mission: string;
  enabled: boolean;
  status: StudioStatus;
  manifest?: StudioManifest;
}

export interface Agent extends BaseEntity {
  organizationId?: string;
  studioId: string;
  name: string;
  role: string;
  status: AgentStatus;
  healthScore: number;
  currentTask: string;
  modelId?: string;
}

export interface AgentMemory extends BaseEntity {
  agentId: string;
  projectId?: string | null;
  memoryType: AgentMemoryType;
  content: string;
  importanceScore: number;
}

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

export interface WorkRequest extends BaseEntity {
  organizationId?: string;
  projectId: string;
  studioId: string;
  objective: string;
  constraints: string[];
  successCriteria: string[];
  contextArtifacts: string[];
  priority: WorkRequestPriority;
  status?: WorkRequestStatus;
}

export interface WorkResponse {
  id: string;
  requestId: string;
  studioId: string;
  status: WorkResponseStatus;
  artifactIds: string[];
  summary: string;
  nextRecommendedPhase?: ProjectPhase | string;
}

export interface CreateWorkRequest {
  organizationId?: string;
  projectId: string;
  studioId: string;
  objective: string;
  constraints?: string[];
  successCriteria?: string[];
  contextArtifacts?: string[];
  priority?: WorkRequestPriority;
}

export interface AdvancePhaseRequest {
  projectId: string;
  targetPhase?: ProjectPhase;
  approvedBy?: string;
  notes?: string;
}

export interface JarvisProjectState {
  projectId: string;
  phase: ProjectPhase;
  status: string;
  activeWorkRequests: WorkRequest[];
  activeAgents: Agent[];
  blockedReasons: string[];
  readyForNextPhase: boolean;
  nextPhase?: ProjectPhase | null;
}

export interface StudioExecuteRequest {
  workRequest: WorkRequest;
  context?: AgentContext;
  preferredProvider?: string;
  preferredModel?: string;
}

export interface StudioValidateRequest {
  artifactId: string;
  criteria?: string[];
}

export interface StudioSummarizeRequest {
  projectId: string;
  artifactIds: string[];
}

export interface StudioHandoffRequest {
  projectId: string;
  fromStudioId: string;
  toStudioId: string;
  artifactIds: string[];
  summary: string;
}
