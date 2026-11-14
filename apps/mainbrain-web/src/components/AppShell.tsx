import type { ReactNode } from "react";

export interface AppShellProps {
  children?: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return <div data-cortexos-shell="app-shell">{children}</div>;
}
