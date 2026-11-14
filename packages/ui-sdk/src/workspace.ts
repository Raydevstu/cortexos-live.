export interface Workspace {
  id: string;
  agentId: string;
  title: string;
  state: "open" | "closed" | "pinned";
  mode?: "floating" | "docked" | "fullscreen" | "pinned";
}
