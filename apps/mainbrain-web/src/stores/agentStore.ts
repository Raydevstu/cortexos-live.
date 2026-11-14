import type { Agent } from "../../../../packages/shared-types/src";

export interface AgentStoreState {
  agents: Agent[];
}

export const initialAgentStoreState: AgentStoreState = {
  agents: [],
};
