import type { AgentDockItem } from "../../../../../packages/ui-sdk/src";

export interface AgentDockProps {
  items: AgentDockItem[];
}

export function AgentDock({ items }: AgentDockProps) {
  return <nav aria-label="Agent Dock" data-count={items.length} />;
}
