import type { ModelDescriptor } from "./capabilities";

export interface ProviderAdapter {
  id: string;
  name: string;
  initialize(): Promise<void>;
  healthCheck(): Promise<boolean>;
  listModels(): Promise<ModelDescriptor[]>;
  generate(request: Record<string, unknown>): Promise<Record<string, unknown>>;
  stream(request: Record<string, unknown>): AsyncIterable<Record<string, unknown>>;
  embed(texts: string[]): Promise<number[][]>;
  cancel(requestId: string): Promise<void>;
}
