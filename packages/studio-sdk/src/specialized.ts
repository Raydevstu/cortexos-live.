import type { Studio } from "./studio";

export interface DesignStudio extends Studio {
  createWireframes(): Promise<void>;
  createFlows(): Promise<void>;
  createDesignSystem(): Promise<void>;
  accessibilityReview(): Promise<void>;
}

export interface ArchitectureStudio extends Studio {
  createArchitecture(): Promise<void>;
  createOpenAPI(): Promise<void>;
  createDatabaseSchema(): Promise<void>;
  createInfrastructure(): Promise<void>;
}
