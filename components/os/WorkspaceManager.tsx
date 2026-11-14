"use client";

import { useCallback } from "react";
import { useAgentOS } from "@/lib/agent-os-store";
import type { DockAgentId, WorkspaceMode, WorkspaceWindowState } from "@/lib/agent-os-logic";

export function useWorkspaceManager() {
  const {
    workspaces,
    summonAgent,
    summonUtilityWorkspace,
    setWorkspaceMode,
    closeWorkspace,
    focusWorkspace,
  } = useAgentOS();

  const slideIn = useCallback(
    (agentId: DockAgentId, mode: WorkspaceMode = "drawer") => {
      summonAgent(agentId, mode);
    },
    [summonAgent]
  );

  const slideOut = useCallback(
    (id: string) => {
      closeWorkspace(id);
    },
    [closeWorkspace]
  );

  const pin = useCallback(
    (id: string, shouldPin: boolean) => {
      setWorkspaceMode(id, shouldPin ? "pinned" : "drawer");
    },
    [setWorkspaceMode]
  );

  const dock = useCallback(
    (id: string) => {
      setWorkspaceMode(id, "docked");
    },
    [setWorkspaceMode]
  );

  const focus = useCallback(
    (id: string) => {
      focusWorkspace(id);
    },
    [focusWorkspace]
  );

  return {
    workspaces,
    slideIn,
    slideOut,
    pin,
    dock,
    focus,
    summonUtilityWorkspace,
    setWorkspaceMode,
  };
}

export interface WorkspaceManagerSummary {
  pinned: WorkspaceWindowState[];
  floating: WorkspaceWindowState[];
  focused: WorkspaceWindowState | null;
  docked: WorkspaceWindowState[];
}

export function partitionWorkspaces(
  windows: WorkspaceWindowState[]
): WorkspaceManagerSummary {
  const focused = windows.find((w) => w.mode === "focused") ?? null;
  const pinned = windows.filter((w) => w.mode === "pinned");
  const floating = windows.filter((w) => w.mode === "drawer");
  const docked = windows.filter((w) => w.mode === "docked");
  return { pinned, floating, focused, docked };
}

export default function WorkspaceManager() {
  // Logic-only coordinator hook & state partitioner exposed cleanly to WorkspaceHost
  return null;
}
