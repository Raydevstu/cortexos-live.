import type { Workspace } from "../../../../packages/ui-sdk/src";

export interface WorkspaceStoreState {
  workspaces: Workspace[];
  focusedId: string | null;
}

export const initialWorkspaceStoreState: WorkspaceStoreState = {
  workspaces: [],
  focusedId: null,
};
