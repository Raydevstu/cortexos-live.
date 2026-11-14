import type { AgentStatus } from "../../shared-types/src";

export interface AgentDockItem {
  id: string;
  name: string;
  status: AgentStatus;
  workload: number;
  currentTask: string;
  healthScore: number;
  lastArtifact?: string;
}
