import type { Workspace } from "../../../../../packages/ui-sdk/src";

export function StudioWorkspace({ workspace }: { workspace: Workspace }) {
  return <section data-workspace-id={workspace.id} data-agent-id={workspace.agentId} />;
}
