import type { BaseEntity } from "./base";

export interface Provider extends BaseEntity {
  name: string;
  type: "cloud" | "local" | "enterprise";
  healthy: boolean;
}

export interface Workflow extends BaseEntity {
  projectId: string;
  workflowType: string;
  status: string;
  currentStep: string;
  startedAt: string;
  completedAt?: string | null;
}
