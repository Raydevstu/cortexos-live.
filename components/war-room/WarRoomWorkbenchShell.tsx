"use client";

import React from "react";
import { useAgentOS } from "@/lib/agent-os-store";
import {
  buildWarRoomGridCssVars,
  type WarRoomPanelId,
} from "@/lib/war-room/workspace-state";
import DockZoneFrame from "@/components/war-room/DockZoneFrame";

export interface WarRoomWorkbenchShellProps {
  renderPanel: (panelId: WarRoomPanelId) => React.ReactNode;
}

/**
 * Step 4 — Deterministic 4-Zone War Room Workbench Shell
 *
 * Architectural Guarantees:
 * 1. Fixed 4-zone topology only: Left, Center, Right, Bottom.
 * 2. Uses `DockZoneFrame` for all 4 zones.
 * 3. Uses CSS custom properties (`--wr-left-w`, `--wr-right-w`, `--wr-bottom-h`)
 *    on `[data-war-room-grid]` for zero-rerender 60fps pointer resizing and
 *    WCAG 2.1 AA keyboard splitter resizing.
 * 4. Single source of truth via `AgentOSProvider` (`useAgentOS().warRoomLayout`).
 */
export default function WarRoomWorkbenchShell({
  renderPanel,
}: WarRoomWorkbenchShellProps) {
  const { warRoomLayout } = useAgentOS();

  const cssVars = buildWarRoomGridCssVars(
    warRoomLayout.dimensions
  ) as React.CSSProperties;

  return (
    <div
      data-war-room-grid
      data-testid="war-room-workbench-shell"
      data-active-preset={warRoomLayout.activePresetId}
      style={cssVars}
      className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative bg-[#0c0d0f]"
    >
      {/* ================================================================== */}
      {/* TOP HORIZONTAL WORKBENCH ROW: LEFT · CENTER · RIGHT                */}
      {/* ================================================================== */}
      <div
        data-testid="war-room-workbench-top-row"
        className="flex-1 flex min-w-0 min-h-0 overflow-hidden"
      >
        {/* Zone 1: Left Dock Zone */}
        <DockZoneFrame
          zoneId="left"
          renderPanel={renderPanel}
          className="w-[var(--wr-left-w,310px)] h-full shrink-0 border-r border-[#e4e6eb]/15"
        />

        {/* Zone 2: Center Stage Zone (Protected — Never Collapses, Never Empty) */}
        <DockZoneFrame
          zoneId="center"
          renderPanel={renderPanel}
          className="flex-1 h-full min-w-[320px] min-h-0"
        />

        {/* Zone 3: Right Inspector Zone */}
        <DockZoneFrame
          zoneId="right"
          renderPanel={renderPanel}
          className="w-[var(--wr-right-w,330px)] h-full shrink-0 border-l border-[#e4e6eb]/15"
        />
      </div>

      {/* ================================================================== */}
      {/* BOTTOM CONSOLE ROW: TERMINAL · HARNESS · LOGS & TELEMETRY          */}
      {/* ================================================================== */}
      <DockZoneFrame
        zoneId="bottom"
        renderPanel={renderPanel}
        className="h-[var(--wr-bottom-h,240px)] w-full shrink-0 border-t border-[#e4e6eb]/15"
      />
    </div>
  );
}
