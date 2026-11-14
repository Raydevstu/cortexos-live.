export interface TerminalSession {
  id: string;
  provider: string;
  model: string;
  projectId: string;
  mode: "chat" | "build" | "research" | "execute" | "agent";
}
