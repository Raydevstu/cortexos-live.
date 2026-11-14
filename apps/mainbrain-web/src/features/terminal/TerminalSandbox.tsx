import type { ReactNode } from "react";

export function TerminalSandbox({ children }: { children?: ReactNode }) {
  return <section data-cortexos-runtime="terminal-sandbox">{children}</section>;
}
