export type ToolCategory = "github" | "filesystem" | "documentation" | "terminal";

export type ToolAccessMode = "read" | "write" | "execute";

export interface ToolManifest {
  name: string;
  category: ToolCategory;
  accessMode: ToolAccessMode;
  version: string;
  description: string;
  allowedStudios: readonly string[];
  requiresSandboxIsolation: boolean;
  emitsArtifact: boolean;
  inputFields: readonly string[];
}

export interface ToolPermissionResult {
  allowed: boolean;
  reason: string;
  sandboxRoot: string;
  resolvedPath?: string;
  deniedRule?: string;
}

export interface ToolExecutionRequest {
  toolName: string;
  agentId: string;
  studioId: string;
  projectId: string;
  workRequestId?: string;
  workflowId?: string;
  actorId?: string;
  parameters: Record<string, unknown>;
}

export type ToolExecutionStatus = "completed" | "failed" | "denied";

export interface ToolExecutionRecord {
  id: string;
  toolName: string;
  category: ToolCategory;
  agentId: string;
  studioId: string;
  projectId: string;
  workRequestId?: string;
  workflowId?: string;
  status: ToolExecutionStatus;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  inputSummary: string;
  resultSummary: string;
  output: Record<string, unknown>;
  artifactId?: string;
  artifactTitle?: string;
  knowledgeCandidateTitle?: string;
  auditEntryId: string;
  checksum: string;
  sandboxRoot: string;
}

export interface ToolAuditEntry {
  id: string;
  executionId: string;
  toolName: string;
  category: ToolCategory;
  agentId: string;
  studioId: string;
  projectId: string;
  action: string;
  allowed: boolean;
  reason: string;
  checksum: string;
  timestamp: string;
  details: Record<string, unknown>;
}
