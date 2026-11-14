import type { BaseEntity } from "./base";
import type {
  ModelCapability,
  ProviderId,
  ProviderType,
  TerminalMode,
} from "./enums";

export interface Provider extends BaseEntity {
  providerId?: ProviderId | string;
  name: string;
  type: ProviderType;
  healthy: boolean;
  endpoint?: string | null;
  modelsCount?: number;
}

export interface ProviderCapability {
  chat: boolean;
  reasoning: boolean;
  coding: boolean;
  tools: boolean;
  files: boolean;
  vision: boolean;
  audio?: boolean;
  agent?: boolean;
}

export interface ModelDescriptor {
  provider: string;
  model: string;
  displayName: string;
  capabilities: ProviderCapability;
  contextWindow: number;
  costInput: number;
  costOutput: number;
  available: boolean;
}

export interface ProviderHealthStatus {
  provider: string;
  healthy: boolean;
  latencyMs?: number | null;
  lastCheckedAt: string;
  error?: string | null;
}

export interface ModelRoutingRequest {
  requiredCapabilities: ModelCapability[];
  preferredProvider?: string;
  projectId?: string;
  studioId?: string;
  maxCostInput?: number;
  allowLocalFallback?: boolean;
}

export interface ModelRoutingDecision {
  provider: string;
  model: string;
  reason: string;
  fallbackChain: string[];
  estimatedCostInput: number;
  estimatedCostOutput: number;
}

export interface ProviderUsageRecord {
  id: string;
  projectId: string;
  studioId?: string | null;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  recordedAt: string;
}

export interface ProviderGenerateRequest {
  provider?: string;
  model?: string;
  mode: TerminalMode;
  prompt: string;
  projectId?: string;
  studioId?: string;
  requiredCapabilities?: ModelCapability[];
  contextStack?: TerminalContextStack;
  tools?: string[];
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderGenerateResponse {
  requestId: string;
  provider: string;
  model: string;
  output: string;
  toolCalls?: Record<string, unknown>[];
  artifactIds?: string[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
}

export interface TerminalContextStack {
  userPrompt: string;
  projectContext?: string;
  artifactContext?: string[];
  memoryContext?: string[];
  knowledgeContext?: string[];
  studioContext?: string;
}

export interface TerminalExecutionRecord {
  id: string;
  sessionId: string;
  projectId: string;
  command: string;
  mode: TerminalMode;
  provider: string;
  model: string;
  studioId?: string | null;
  artifactIds: string[];
  status: "running" | "completed" | "failed" | "cancelled";
  outputSummary?: string;
  startedAt: string;
  completedAt?: string | null;
}
