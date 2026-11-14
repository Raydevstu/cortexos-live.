import type { ReactNode } from "react";

export function WorkspaceManager({ children }: { children?: ReactNode }) {
  return <div data-cortexos-manager="workspaces">{children}</div>;
}
