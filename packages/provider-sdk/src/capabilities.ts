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
