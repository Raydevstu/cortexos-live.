"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  EyeOff,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";
import {
  WAR_ROOM_CSS_VARS,
  WAR_ROOM_PANELS,
  ZONE_DIMENSION_BOUNDS,
  clampNumber,
  getAllowedTargetZonesForPanel,
  stepWarRoomZoneDimension,
  type DockZoneId,
  type WarRoomPanelId,
} from "@/lib/war-room/workspace-state";

export interface DockZoneFrameProps {
  zoneId: DockZoneId;
  renderPanel: (panelId: WarRoomPanelId) => React.ReactNode;
  className?: string;
}

const ZONE_LABELS: Record<DockZoneId, { title: string; shortCode: string }> = {
  left: { title: "Left Dock Zone", shortCode: "L" },
  center: { title: "Center Stage Zone", shortCode: "C" },
  right: { title: "Right Inspector Zone", shortCode: "R" },
  bottom: { title: "Bottom Console Zone", shortCode: "B" },
};

export default function DockZoneFrame({
  zoneId,
  renderPanel,
  className = "",
}: DockZoneFrameProps) {
  const {
    warRoomLayout,
    activateWarRoomPanel,
    moveWarRoomPanelToZone,
    toggleWarRoomPanelVisibility,
    toggleWarRoomZoneCollapsed,
    setWarRoomMaximizedPanel,
    commitWarRoomZoneDimensions,
  } = useAgentOS();

  const frameRef = useRef<HTMLElement | null>(null);

  const zoneState = warRoomLayout.zones[zoneId];
  const visiblePanels = zoneState.panelIds.filter(
    (id) => !warRoomLayout.hiddenPanelIds.includes(id)
  );

  const activePanelId: WarRoomPanelId | null =
    zoneState.activePanelId && visiblePanels.includes(zoneState.activePanelId)
      ? zoneState.activePanelId
      : visiblePanels[0] ?? zoneState.panelIds[0] ?? null;

  const activePanelMeta = activePanelId ? WAR_ROOM_PANELS[activePanelId] : null;
  const isMaximized =
    activePanelId !== null && warRoomLayout.maximizedPanelId === activePanelId;
  const isCollapsed =
    zoneId !== "center" && (zoneState.collapsed || visiblePanels.length === 0);

  // Enforce Center-Stage non-empty protection at UI level
  const isLastCenterPanel = zoneId === "center" && visiblePanels.length <= 1;

  // Enforce allowedZones metadata at UI level
  const allowedTargetZones: readonly DockZoneId[] = activePanelId
    ? getAllowedTargetZonesForPanel(activePanelId)
    : [];

  // Escape key restores maximized panel if no modal dialog is open
  useEffect(() => {
    if (!isMaximized) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      e.stopPropagation();
      setWarRoomMaximizedPanel(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMaximized, setWarRoomMaximizedPanel]);

  // Helper to locate parent [data-war-room-grid] container for 60fps CSS variable mutation
  const findGridContainer = useCallback((): HTMLElement | null => {
    if (!frameRef.current) return null;
    return frameRef.current.closest<HTMLElement>("[data-war-room-grid]");
  }, []);

  // --------------------------------------------------------------------------
  // CSS-Variable Pointer Resize Handler (Zero Context Re-Render on PointerMove)
  // --------------------------------------------------------------------------
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (zoneId === "center") return;
      e.preventDefault();
      const handleEl = e.currentTarget;
      handleEl.setPointerCapture(e.pointerId);

      const startX = e.clientX;
      const startY = e.clientY;
      const startDims = warRoomLayout.dimensions;
      const gridEl = findGridContainer();

      let latestDims = { ...startDims };

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (zoneId === "left") {
          const deltaX = moveEvent.clientX - startX;
          const nextW = clampNumber(
            startDims.leftWidthPx + deltaX,
            ZONE_DIMENSION_BOUNDS.leftWidthPx.min,
            ZONE_DIMENSION_BOUNDS.leftWidthPx.max
          );
          latestDims = { ...latestDims, leftWidthPx: nextW };
          gridEl?.style.setProperty(WAR_ROOM_CSS_VARS.leftWidth, `${nextW}px`);
        } else if (zoneId === "right") {
          const deltaX = startX - moveEvent.clientX;
          const nextW = clampNumber(
            startDims.rightWidthPx + deltaX,
            ZONE_DIMENSION_BOUNDS.rightWidthPx.min,
            ZONE_DIMENSION_BOUNDS.rightWidthPx.max
          );
          latestDims = { ...latestDims, rightWidthPx: nextW };
          gridEl?.style.setProperty(WAR_ROOM_CSS_VARS.rightWidth, `${nextW}px`);
        } else if (zoneId === "bottom") {
          const deltaY = startY - moveEvent.clientY;
          const nextH = clampNumber(
            startDims.bottomHeightPx + deltaY,
            ZONE_DIMENSION_BOUNDS.bottomHeightPx.min,
            ZONE_DIMENSION_BOUNDS.bottomHeightPx.max
          );
          latestDims = { ...latestDims, bottomHeightPx: nextH };
          gridEl?.style.setProperty(WAR_ROOM_CSS_VARS.bottomHeight, `${nextH}px`);
        }
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        if (handleEl.hasPointerCapture(upEvent.pointerId)) {
          handleEl.releasePointerCapture(upEvent.pointerId);
        }
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        commitWarRoomZoneDimensions(latestDims);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [commitWarRoomZoneDimensions, findGridContainer, warRoomLayout.dimensions, zoneId]
  );

  // --------------------------------------------------------------------------
  // WCAG 2.1 AA Keyboard-Accessible Splitter Resizing
  // --------------------------------------------------------------------------
  const handleResizeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (zoneId === "center") return;
      const gridEl = findGridContainer();
      const dims = warRoomLayout.dimensions;

      if (zoneId === "left") {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const dir = e.key === "ArrowRight" ? 1 : -1;
          const next = stepWarRoomZoneDimension(dims, "left", dir);
          gridEl?.style.setProperty(WAR_ROOM_CSS_VARS.leftWidth, `${next.leftWidthPx}px`);
          commitWarRoomZoneDimensions({ leftWidthPx: next.leftWidthPx });
        } else if (e.key === "Home") {
          e.preventDefault();
          const min = ZONE_DIMENSION_BOUNDS.leftWidthPx.min;
          gridEl?.style.setProperty(WAR_ROOM_CSS_VARS.leftWidth, `${min}px`);
          commitWarRoomZoneDimensions({ leftWidthPx: min });
        } else if (e.key === "End") {
          e.preventDefault();
          const max = ZONE_DIMENSION_BOUNDS.leftWidthPx.max;
          gridEl?.style.setProperty(WAR_ROOM_CSS_VARS.leftWidth, `${max}px`);
          commitWarRoomZoneDimensions({ leftWidthPx: max });
        }
      } else if (zoneId === "right") {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          const dir = e.key === "ArrowLeft" ? 1 : -1;
          const next = stepWarRoomZoneDimension(dims, "right", dir);
          gridEl?.style.setProperty(WAR_ROOM_CSS_VARS.rightWidth, `${next.rightWidthPx}px`);
          commitWarRoomZoneDimensions({ rightWidthPx: next.rightWidthPx });
        } else if (e.key === "Home") {
          e.preventDefault();
          const min = ZONE_DIMENSION_BOUNDS.rightWidthPx.min;
          gridEl?.style.setProperty(WAR_ROOM_CSS_VARS.rightWidth, `${min}px`);
          commitWarRoomZoneDimensions({ rightWidthPx: min });
        } else if (e.key === "End") {
          e.preventDefault();
          const max = ZONE_DIMENSION_BOUNDS.rightWidthPx.max;
          gridEl?.style.setProperty(WAR_ROOM_CSS_VARS.rightWidth, `${max}px`);
          commitWarRoomZoneDimensions({ rightWidthPx: max });
        }
      } else if (zoneId === "bottom") {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const dir = e.key === "ArrowUp" ? 1 : -1;
          const next = stepWarRoomZoneDimension(dims, "bottom", dir);
          gridEl?.style.setProperty(WAR_ROOM_CSS_VARS.bottomHeight, `${next.bottomHeightPx}px`);
          commitWarRoomZoneDimensions({ bottomHeightPx: next.bottomHeightPx });
        } else if (e.key === "Home") {
          e.preventDefault();
          const min = ZONE_DIMENSION_BOUNDS.bottomHeightPx.min;
          gridEl?.style.setProperty(WAR_ROOM_CSS_VARS.bottomHeight, `${min}px`);
          commitWarRoomZoneDimensions({ bottomHeightPx: min });
        } else if (e.key === "End") {
          e.preventDefault();
          const max = ZONE_DIMENSION_BOUNDS.bottomHeightPx.max;
          gridEl?.style.setProperty(WAR_ROOM_CSS_VARS.bottomHeight, `${max}px`);
          commitWarRoomZoneDimensions({ bottomHeightPx: max });
        }
      }
    },
    [commitWarRoomZoneDimensions, findGridContainer, warRoomLayout.dimensions, zoneId]
  );

  // ==========================================================================
  // COLLAPSED ZONE RAIL RENDERING (Left, Right, Bottom)
  // ==========================================================================
  if (isCollapsed && !isMaximized) {
    const isBottom = zoneId === "bottom";
    return (
      <aside
        ref={frameRef}
        aria-label={`${ZONE_LABELS[zoneId].title} (Collapsed)`}
        data-testid={`dock-zone-${zoneId}-collapsed`}
        className={`bg-[#090b0f] border-[#e4e6eb]/15 select-none flex ${
          isBottom
            ? "h-9 w-full border-t flex-row items-center justify-between px-3"
            : zoneId === "left"
            ? "w-9 h-full border-r flex-col items-center justify-between py-3"
            : "w-9 h-full border-l flex-col items-center justify-between py-3"
        } shrink-0`}
      >
        <button
          type="button"
          data-testid={`dock-zone-${zoneId}-expand-btn`}
          aria-label={`Expand ${ZONE_LABELS[zoneId].title}`}
          title={`Expand ${ZONE_LABELS[zoneId].title}`}
          onClick={() => {
            if (visiblePanels.length === 0 && zoneState.panelIds[0]) {
              activateWarRoomPanel(zoneState.panelIds[0]);
            } else {
              toggleWarRoomZoneCollapsed(zoneId);
            }
          }}
          className="p-1.5 rounded-[2px] bg-[#141923] border border-[#e4e6eb]/20 text-[#00ffa3] hover:border-[#00ffa3] transition-colors focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
        >
          {zoneId === "left" ? (
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          ) : zoneId === "right" ? (
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>

        {/* Quick Restore Buttons for Panels Docked in This Zone */}
        <div
          className={`flex items-center gap-1.5 ${
            isBottom ? "flex-row overflow-x-auto" : "flex-col"
          }`}
        >
          {zoneState.panelIds.map((panelId) => {
            const meta = WAR_ROOM_PANELS[panelId];
            return (
              <button
                key={panelId}
                type="button"
                data-testid={`dock-zone-${zoneId}-restore-${panelId}`}
                onClick={() => activateWarRoomPanel(panelId)}
                title={`Open ${meta.title}`}
                aria-label={`Open ${meta.title}`}
                className="px-1.5 py-1 rounded-[2px] bg-black border border-white/15 hover:border-[#00ffa3] text-[10px] font-mono text-[#e4e6eb] hover:text-[#00ffa3] transition-colors focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
              >
                {isBottom ? `${meta.number}. ${meta.shortTitle}` : `0${meta.number}`}
              </button>
            );
          })}
        </div>

        <span className="text-[10px] font-mono uppercase text-slate-500">
          {ZONE_LABELS[zoneId].shortCode}
        </span>
      </aside>
    );
  }

  // ==========================================================================
  // RESIZE SPLITTER METADATA
  // ==========================================================================
  const resizeBounds =
    zoneId === "left"
      ? ZONE_DIMENSION_BOUNDS.leftWidthPx
      : zoneId === "right"
      ? ZONE_DIMENSION_BOUNDS.rightWidthPx
      : zoneId === "bottom"
      ? ZONE_DIMENSION_BOUNDS.bottomHeightPx
      : null;

  const currentDimensionValue =
    zoneId === "left"
      ? warRoomLayout.dimensions.leftWidthPx
      : zoneId === "right"
      ? warRoomLayout.dimensions.rightWidthPx
      : zoneId === "bottom"
      ? warRoomLayout.dimensions.bottomHeightPx
      : 0;

  return (
    <section
      ref={frameRef}
      aria-label={ZONE_LABELS[zoneId].title}
      data-testid={`dock-zone-${zoneId}`}
      data-zone-id={zoneId}
      className={`relative flex flex-col min-w-0 min-h-0 bg-[#0c0d0f] text-[#e4e6eb] overflow-hidden ${
        isMaximized
          ? "fixed inset-0 z-50 bg-[#090b0f] border-2 border-[#00ffa3] shadow-2xl"
          : className
      }`}
    >
      {/* ==================================================================== */}
      {/* ACCESSIBLE CSS-VARIABLE RESIZE SPLITTER HANDLE                       */}
      {/* ==================================================================== */}
      {zoneId !== "center" && !isMaximized && resizeBounds && (
        <div
          role="separator"
          tabIndex={0}
          data-testid={`dock-zone-${zoneId}-resizer`}
          aria-label={`Resize ${ZONE_LABELS[zoneId].title} (Use arrow keys to resize)`}
          aria-orientation={zoneId === "bottom" ? "horizontal" : "vertical"}
          aria-valuemin={resizeBounds.min}
          aria-valuemax={resizeBounds.max}
          aria-valuenow={currentDimensionValue}
          onPointerDown={handleResizePointerDown}
          onKeyDown={handleResizeKeyDown}
          className={`z-20 transition-colors focus-visible:outline-none focus-visible:bg-[#00ffa3] hover:bg-[#00ffa3]/70 ${
            zoneId === "left"
              ? "absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize"
              : zoneId === "right"
              ? "absolute top-0 left-0 bottom-0 w-1.5 cursor-col-resize"
              : "absolute top-0 left-0 right-0 h-1.5 cursor-row-resize"
          }`}
        />
      )}

      {/* ==================================================================== */}
      {/* ZONE HEADER: TABS · ALLOWED-ZONE PLACEMENT · COLLAPSE · MAXIMIZE     */}
      {/* ==================================================================== */}
      <div
        data-testid={`dock-zone-${zoneId}-header`}
        className="shrink-0 px-3 py-1.5 bg-[#10141c] border-b border-[#e4e6eb]/15 flex items-center justify-between gap-2 select-none"
      >
        {/* Left: Zone Panel Tabs (No Drag-and-Drop) */}
        <div
          role="tablist"
          aria-label={`${ZONE_LABELS[zoneId].title} Panels`}
          className="flex items-center gap-1 overflow-x-auto min-w-0 py-0.5"
        >
          {visiblePanels.map((panelId) => {
            const meta = WAR_ROOM_PANELS[panelId];
            const isTabActive = activePanelId === panelId;
            return (
              <button
                key={panelId}
                type="button"
                role="tab"
                aria-selected={isTabActive}
                data-testid={`dock-zone-${zoneId}-tab-${panelId}`}
                title={`${meta.title} — ${meta.purpose}`}
                onClick={() => activateWarRoomPanel(panelId)}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-[#00ffa3] ${
                  isTabActive
                    ? "bg-[#00ffa3] text-black font-bold"
                    : "bg-black/60 border border-white/10 text-[#e4e6eb]/75 hover:text-white hover:border-white/30"
                }`}
              >
                <span className="tabular-nums text-[10px] opacity-80">0{meta.number}.</span>
                <span>{meta.shortTitle}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Deterministic Allowed-Zone Placement + Hide + Collapse + Maximize */}
        {activePanelId && activePanelMeta && (
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Deterministic Allowed-Zone Placement Controls (UI-Level Enforcement) */}
            <div
              role="group"
              aria-label={`Move ${activePanelMeta.shortTitle} to allowed zone`}
              data-testid={`dock-zone-${zoneId}-placement-controls`}
              className="hidden sm:flex items-center gap-0.5 bg-black/70 border border-white/10 rounded-[2px] p-0.5"
            >
              <span className="text-[9px] font-mono uppercase text-slate-400 px-1">
                Zone:
              </span>
              {allowedTargetZones.map((targetZone) => {
                const isCurrentZone = targetZone === zoneId;
                const disableMove = !isCurrentZone && isLastCenterPanel;
                return (
                  <button
                    key={targetZone}
                    type="button"
                    disabled={disableMove}
                    data-testid={`dock-move-${activePanelId}-to-${targetZone}`}
                    aria-pressed={isCurrentZone}
                    aria-label={`Place ${activePanelMeta.shortTitle} in ${ZONE_LABELS[targetZone].title}`}
                    title={
                      disableMove
                        ? "Center Stage must retain at least one visible panel"
                        : `Place ${activePanelMeta.shortTitle} in ${ZONE_LABELS[targetZone].title}`
                    }
                    onClick={() => moveWarRoomPanelToZone(activePanelId, targetZone)}
                    className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono uppercase transition-colors focus-visible:outline-2 focus-visible:outline-[#00ffa3] disabled:opacity-35 disabled:cursor-not-allowed ${
                      isCurrentZone
                        ? "bg-[#003322] text-[#00ffa3] border border-[#00ffa3]/60 font-bold"
                        : "text-slate-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {ZONE_LABELS[targetZone].shortCode}
                  </button>
                );
              })}
            </div>

            {/* Hide Active Panel Button */}
            {!isLastCenterPanel && (
              <button
                type="button"
                data-testid={`dock-zone-${zoneId}-hide-panel`}
                aria-label={`Hide ${activePanelMeta.shortTitle} Panel`}
                title={`Hide ${activePanelMeta.shortTitle} Panel`}
                onClick={() => toggleWarRoomPanelVisibility(activePanelId)}
                className="p-1 rounded-[2px] bg-black border border-white/15 text-slate-400 hover:text-white hover:border-white/35 transition-colors focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
              >
                <EyeOff className="w-3 h-3" aria-hidden="true" />
              </button>
            )}

            {/* Collapse Zone Button (Left, Right, Bottom only) */}
            {zoneId !== "center" && !isMaximized && (
              <button
                type="button"
                data-testid={`dock-zone-${zoneId}-collapse-btn`}
                aria-label={`Collapse ${ZONE_LABELS[zoneId].title}`}
                title={`Collapse ${ZONE_LABELS[zoneId].title}`}
                onClick={() => toggleWarRoomZoneCollapsed(zoneId)}
                className="p-1 rounded-[2px] bg-black border border-white/15 text-slate-300 hover:text-[#00ffa3] hover:border-[#00ffa3] transition-colors focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
              >
                {zoneId === "left" ? (
                  <ChevronLeft className="w-3 h-3" aria-hidden="true" />
                ) : zoneId === "right" ? (
                  <ChevronRight className="w-3 h-3" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3 h-3" aria-hidden="true" />
                )}
              </button>
            )}

            {/* Maximize / Restore Active Panel Button */}
            <button
              type="button"
              data-testid={`dock-zone-${zoneId}-maximize-btn`}
              aria-label={
                isMaximized
                  ? `Restore ${activePanelMeta.shortTitle} Panel`
                  : `Maximize ${activePanelMeta.shortTitle} Panel`
              }
              aria-pressed={isMaximized}
              title={
                isMaximized
                  ? `Restore ${activePanelMeta.shortTitle} (Esc)`
                  : `Maximize ${activePanelMeta.shortTitle}`
              }
              onClick={() =>
                setWarRoomMaximizedPanel(isMaximized ? null : activePanelId)
              }
              className={`p-1 rounded-[2px] border transition-colors focus-visible:outline-2 focus-visible:outline-[#00ffa3] ${
                isMaximized
                  ? "bg-[#00ffa3] text-black border-[#00ffa3]"
                  : "bg-black border-white/15 text-slate-300 hover:text-[#00ffa3] hover:border-[#00ffa3]"
              }`}
            >
              {isMaximized ? (
                <Minimize2 className="w-3 h-3" aria-hidden="true" />
              ) : (
                <Maximize2 className="w-3 h-3" aria-hidden="true" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* ACTIVE PANEL VIEWPORT BODY                                           */}
      {/* ==================================================================== */}
      <div
        role="tabpanel"
        aria-label={activePanelMeta ? activePanelMeta.title : ZONE_LABELS[zoneId].title}
        data-testid={`dock-zone-${zoneId}-body`}
        className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col"
      >
        {activePanelId ? renderPanel(activePanelId) : null}
      </div>
    </section>
  );
}
