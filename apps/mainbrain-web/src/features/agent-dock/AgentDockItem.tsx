import type { AgentDockItem as AgentDockItemContract } from "../../../../../packages/ui-sdk/src";

export type AgentDockItemProps = AgentDockItemContract;

export function AgentDockItem({ id, name, status }: AgentDockItemProps) {
  return <button type="button" data-agent-id={id} data-status={status}>{name}</button>;
}
