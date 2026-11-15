"use client";

import React from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  Cpu,
  DollarSign,
  FolderGit2,
  Layers,
  LayoutGrid,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Target,
  Unlock,
} from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";
import {
  CORTEXOS_MISSIONS,
  WAR_ROOM_PANEL_IDS,
  WAR_ROOM_PANELS,
  WAR_ROOM_PRESETS,
  findPanelZone,
  isWarRoomPanelVisible,
  type MissionId,
  type WarRoomPanelId,
  type WarRoomPresetId,
} from "@/lib/war-room/workspace-state";
import { LIFECYCLE_PHASES, type Project, type StudioSlug } from "@/lib/cortex-os-data";

export interface WarRoomHeaderProps {
  projects: Project[];
  activeProject: Project;
  onSelectProject: (projectId: string) => void;
  isCreatingProject: boolean;
  onToggleCreateProject: () => void;
  onSelectPhase: (phase: StudioSlug) => void;
  sourcesCount: number;
  artifactsCount: number;
  wikiPagesCount: number;
  isOwnerUnlocked: boolean;
  onOpenUnlockModal: () => void;
  rightPanelCollapsed: boolean;
  onToggleRightPanel: () => void;
  onLegacyPanelBridge?: (panelId: WarRoomPanelId) => void;
  onExecuteNextStep?: (command: string, targetPanel: WarRoomPanelId) => void;
}

const PRESET_ORDER: readonly WarRoomPresetId[] = [
  "mission-execution",
  "code-and-sandbox",
  "review-and-gates",
  "operator-harness",
] as const;

const MISSION_ORDER: readonly MissionId[] = [
  "build-software",
  "launch-product",
  "research-topics",
  "create-content",
  "analyze-knowledge",
  "run-operations",
] as const;

const ZONE_SHORT_LABEL: Record<string, string> = {
  left: "L",
  center: "C",
  right: "R",
  bottom: "B",
};

export default function WarRoomHeader({
  projects,
  activeProject,
  onSelectProject,
  isCreatingProject,
  onToggleCreateProject,
  onSelectPhase,
  sourcesCount,
  artifactsCount,
  wikiPagesCount,
  isOwnerUnlocked,
  onOpenUnlockModal,
  rightPanelCollapsed,
  onToggleRightPanel,
  onLegacyPanelBridge,
  onExecuteNextStep,
}: WarRoomHeaderProps) {
  const {
    activeMission,
    setActiveMission,
    warRoomLayout,
    goldenRuleTelemetry,
    applyWarRoomPreset,
    toggleWarRoomPanelVisibility,
    activateWarRoomPanel,
    runTerminalCommand,
  } = useAgentOS();

  const handlePanelButtonClick = (panelId: WarRoomPanelId) => {
    toggleWarRoomPanelVisibility(panelId);
    onLegacyPanelBridge?.(panelId);
  };

  const handleTriggerNextAction = () => {
    const targetPanel = goldenRuleTelemetry.nextStepTargetPanel;
    const cmd = goldenRuleTelemetry.nextStepCommand;
    activateWarRoomPanel(targetPanel);
    onLegacyPanelBridge?.(targetPanel);
    if (onExecuteNextStep) {
      onExecuteNextStep(cmd, targetPanel);
    } else {
      void runTerminalCommand(cmd);
    }
  };

  const stateColorClass =
    goldenRuleTelemetry.executionState === "executing"
      ? "text-[#00ffa3]"
      : goldenRuleTelemetry.executionState === "planning"
      ? "text-sky-400"
      : goldenRuleTelemetry.executionState === "reviewing"
      ? "text-violet-300"
      : goldenRuleTelemetry.executionState === "blocked" ||
        goldenRuleTelemetry.executionState === "failed"
      ? "text-rose-400"
      : "text-slate-300";

  return (
    <header
      aria-label="War Room Execution Header and Telemetry"
      data-testid="war-room-header"
      className="shrink-0 bg-[#0c0d0f] border-b border-[#e4e6eb]/15 select-none"
    >
      {/* ================================================================== */}
      {/* ROW 1: GOVERNANCE BAR — MISSION · PROJECT · 7-PHASE GATES · UNLOCK */}
      {/* ================================================================== */}
      <div className="px-5 py-2 border-b border-[#e4e6eb]/10 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Supervisor Identity + Mission Selector + Project Selector */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-wider text-[#00ffa3]">
            <Cpu className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>JARVIS_SVC</span>
          </div>

          <span className="text-[#e4e6eb]/30" aria-hidden="true">
            ·
          </span>

          {/* Active Mission Selector */}
          <label htmlFor="war-room-mission-select" className="sr-only">
            Active Mission
          </label>
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-[#00ffa3] shrink-0" aria-hidden="true" />
            <select
              id="war-room-mission-select"
              data-testid="war-room-mission-select"
              aria-label="Active Mission"
              value={activeMission}
              onChange={(e) => setActiveMission(e.target.value as MissionId)}
              className="bg-black border border-[#e4e6eb]/20 rounded-[2px] px-2 py-1 text-xs font-mono font-semibold text-[#00ffa3] outline-none focus:border-[#00ffa3]"
            >
              {MISSION_ORDER.map((mId) => {
                const m = CORTEXOS_MISSIONS[mId];
                return (
                  <option key={m.id} value={m.id}>
                    Mission: {m.title}
                  </option>
                );
              })}
            </select>
          </div>

          <span className="text-[#e4e6eb]/30" aria-hidden="true">
            ·
          </span>

          {/* Active Project Selector (Preserved Contract) */}
          <label htmlFor="war-room-project-select" className="sr-only">
            Active Project
          </label>
          <div className="flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <select
              id="war-room-project-select"
              aria-label="Active Project"
              value={activeProject.id}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-black border border-[#e4e6eb]/20 rounded-[2px] px-2.5 py-1 text-xs font-mono text-white outline-none focus:border-[#00ffa3]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onToggleCreateProject}
            aria-expanded={isCreatingProject}
            className="px-2.5 py-1 rounded-[2px] bg-transparent hover:bg-[#e4e6eb]/10 border border-[#e4e6eb]/20 text-[10px] font-mono uppercase tracking-wider text-[#e4e6eb] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
          >
            + New Project
          </button>
        </div>

        {/* Center: 7-Phase Lifecycle Stepper (Preserved Contract) */}
        <div
          className="flex items-center gap-1 overflow-x-auto py-0.5"
          role="group"
          aria-label="Project Lifecycle Phases"
        >
          {LIFECYCLE_PHASES.map((phase, idx) => {
            const isCurrent = activeProject.current_phase === phase;
            const currentIdx = LIFECYCLE_PHASES.indexOf(activeProject.current_phase);
            const isCompleted = idx < currentIdx;
            return (
              <button
                key={phase}
                type="button"
                onClick={() => onSelectPhase(phase)}
                className={`px-2.5 py-1 rounded-[2px] text-[10px] font-mono uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-[#00ffa3] ${
                  isCurrent
                    ? "bg-[#00ffa3] text-black font-bold"
                    : isCompleted
                    ? "bg-[#003322] text-[#00ffa3] border border-[#00ffa3]/40 hover:bg-[#003322]/80"
                    : "bg-[#e4e6eb]/10 text-[#e4e6eb]/55 hover:text-[#e4e6eb] border border-transparent"
                }`}
              >
                <span className="tabular-nums">{idx + 1}.</span>
                <span>{phase}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Quick Stats, Unlock Button & Right Panel Toggle (Preserved Contract) */}
        <div className="flex items-center gap-2.5 text-[11px] text-[#e4e6eb]/60 font-mono tabular-nums shrink-0">
          <span className="hidden xl:inline">
            {sourcesCount} SOURCES · {artifactsCount} ARTIFACTS · {wikiPagesCount} WIKI PAGES
          </span>
          <button
            type="button"
            onClick={onOpenUnlockModal}
            aria-label="Unlock"
            className={`px-2.5 py-1 rounded-[2px] border text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00ffa3] ${
              isOwnerUnlocked
                ? "bg-[#003322] border-[#00ffa3] text-[#00ffa3]"
                : "bg-black border-[#e4e6eb]/25 text-[#e4e6eb] hover:border-[#00ffa3] hover:text-[#00ffa3]"
            }`}
          >
            {isOwnerUnlocked ? (
              <Unlock className="w-3 h-3 text-[#00ffa3]" aria-hidden="true" />
            ) : (
              <Lock className="w-3 h-3 text-amber-400" aria-hidden="true" />
            )}
            <span>Unlock</span>
          </button>
          <button
            type="button"
            onClick={onToggleRightPanel}
            aria-label="Toggle Studio Workbench Panel"
            className="p-1.5 rounded-[2px] bg-black border border-[#e4e6eb]/20 text-[#e4e6eb]/80 hover:text-[#00ffa3] hover:border-[#00ffa3] transition-colors focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
          >
            {rightPanelCollapsed ? (
              <PanelRightOpen className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <PanelRightClose className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* ROW 2: WAR ROOM GOLDEN RULE — 5-SECOND EXECUTION CLARITY STRIP     */}
      {/* Answers: 1. Goal · 2. Running · 3. Agent · 4. Model/Cost ·         */}
      {/*          5. What Happened · 6. What To Do Next                     */}
      {/* ================================================================== */}
      <div
        role="region"
        aria-label="War Room Golden Rule 5-Second Telemetry Strip"
        data-testid="war-room-golden-rule-strip"
        className="px-5 py-2 bg-[#090b0f] border-b border-[#e4e6eb]/10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 items-center text-xs"
      >
        {/* 1. What am I trying to accomplish? */}
        <div className="min-w-0 space-y-0.5" data-testid="golden-rule-mission">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>1. Mission Goal</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#00ffa3]">{goldenRuleTelemetry.activeMissionTitle}</span>
          </div>
          <div
            className="text-xs font-medium text-white truncate"
            title={goldenRuleTelemetry.missionObjective}
          >
            {goldenRuleTelemetry.missionObjective}
          </div>
        </div>

        {/* 2. What is currently running? */}
        <div className="min-w-0 space-y-0.5" data-testid="golden-rule-running">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-[#00ffa3] shrink-0" aria-hidden="true" />
            <span>2. Running</span>
            <span aria-hidden="true">·</span>
            <span className={`font-semibold uppercase ${stateColorClass}`}>
              {goldenRuleTelemetry.executionState}
            </span>
          </div>
          <div
            className="text-xs text-[#e4e6eb] truncate font-mono"
            title={`${goldenRuleTelemetry.activeTaskSummary} (Tool: ${goldenRuleTelemetry.activeToolCall})`}
          >
            {goldenRuleTelemetry.activeTaskSummary}{" "}
            <span className="text-slate-400">· {goldenRuleTelemetry.activeToolCall}</span>
          </div>
        </div>

        {/* 3. Which agent is working? */}
        <div className="min-w-0 space-y-0.5" data-testid="golden-rule-agent">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Bot className="w-3 h-3 text-sky-400 shrink-0" aria-hidden="true" />
            <span>3. Active Agent</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#00ffa3] tabular-nums">
              {goldenRuleTelemetry.activeAgentHealth}% health
            </span>
          </div>
          <div className="text-xs text-white truncate">
            <span className="font-semibold">{goldenRuleTelemetry.activeAgentName}</span>
            <span className="text-slate-400">
              {" "}
              · {goldenRuleTelemetry.activeAgentRole} ({goldenRuleTelemetry.activeAgentsCount}/9 active)
            </span>
          </div>
        </div>

        {/* 4. Which model & provider is being used + Session Cost */}
        <div className="min-w-0 space-y-0.5" data-testid="golden-rule-model-cost">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-3 h-3 text-amber-300 shrink-0" aria-hidden="true" />
            <span>4. Provider &amp; Cost</span>
            <span aria-hidden="true">·</span>
            <span className="text-amber-300 tabular-nums">
              ${goldenRuleTelemetry.estimatedSessionCostUsd.toFixed(4)}
            </span>
          </div>
          <div
            className="text-xs font-mono text-[#e4e6eb] truncate tabular-nums"
            title={`${goldenRuleTelemetry.activeProviderName} · ${goldenRuleTelemetry.activeModel} (${goldenRuleTelemetry.providerLocality}) · ${goldenRuleTelemetry.estimatedTokens.toLocaleString()} est. tokens`}
          >
            {goldenRuleTelemetry.activeProviderName} ·{" "}
            <span className="text-sky-300">{goldenRuleTelemetry.activeModel}</span>{" "}
            <span className="text-slate-400">({goldenRuleTelemetry.providerLocality})</span>
          </div>
        </div>

        {/* 5. What happened? */}
        <div className="min-w-0 space-y-0.5" data-testid="golden-rule-happened">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>5. Latest Outcome</span>
            <span aria-hidden="true">·</span>
            <span className="text-teal-300 tabular-nums">
              {goldenRuleTelemetry.totalToolRuns} runs
            </span>
          </div>
          <div
            className="text-xs text-slate-200 truncate"
            title={goldenRuleTelemetry.whatHappenedSummary}
          >
            {goldenRuleTelemetry.whatHappenedSummary}
          </div>
        </div>

        {/* 6. What should I do next? */}
        <div className="min-w-0 flex items-center justify-end" data-testid="golden-rule-next-action">
          <button
            type="button"
            data-testid="golden-rule-next-step-btn"
            onClick={handleTriggerNextAction}
            title={`${goldenRuleTelemetry.nextStepReason} — Command: ${goldenRuleTelemetry.nextStepCommand}`}
            className="w-full px-3 py-1.5 rounded-[2px] bg-[#00ffa3]/12 hover:bg-[#00ffa3]/20 border border-[#00ffa3]/60 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#00ffa3] min-w-0"
          >
            <div className="flex items-center justify-between gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#00ffa3]">
              <span className="flex items-center gap-1 truncate">
                <Play className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                <span>6. Next Action</span>
              </span>
              <ArrowRight className="w-3 h-3 shrink-0" aria-hidden="true" />
            </div>
            <div className="text-xs font-semibold text-white truncate">
              {goldenRuleTelemetry.nextStepLabel}
            </div>
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* ROW 3: WORKSPACE PRESET SELECTOR & 9 PANEL VISIBILITY CONTROLS     */}
      {/* ================================================================== */}
      <div
        role="toolbar"
        aria-label="War Room Workspace Presets and Panel Visibility Controls"
        data-testid="war-room-workspace-toolbar"
        className="px-5 py-1.5 bg-[#0c0d0f] flex flex-wrap items-center justify-between gap-3"
      >
        {/* Left: 4 Deterministic Workspace Presets */}
        <div
          role="group"
          aria-label="Workspace Layout Presets"
          data-testid="war-room-preset-selector"
          className="flex items-center gap-1 overflow-x-auto py-0.5"
        >
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mr-1.5 flex items-center gap-1 shrink-0">
            <LayoutGrid className="w-3 h-3 text-[#00ffa3]" aria-hidden="true" />
            <span>Preset:</span>
          </span>
          {PRESET_ORDER.map((presetId) => {
            const preset = WAR_ROOM_PRESETS[presetId];
            const isActive = warRoomLayout.activePresetId === presetId;
            return (
              <button
                key={presetId}
                type="button"
                data-testid={`war-room-preset-${presetId}`}
                aria-pressed={isActive}
                title={preset.description}
                onClick={() => applyWarRoomPreset(presetId)}
                className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00ffa3] ${
                  isActive
                    ? "bg-[#00ffa3] text-black font-bold"
                    : "bg-black border border-[#e4e6eb]/15 text-[#e4e6eb]/75 hover:text-white hover:border-[#e4e6eb]/35"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Right: 9 Constitutional Panel Visibility Controls */}
        <div
          role="group"
          aria-label="War Room 9 Panel Visibility Toggles"
          data-testid="war-room-panel-toggles"
          className="flex items-center gap-1 overflow-x-auto py-0.5"
        >
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mr-1.5 flex items-center gap-1 shrink-0">
            <Layers className="w-3 h-3 text-sky-400" aria-hidden="true" />
            <span>Panels (9):</span>
          </span>
          {WAR_ROOM_PANEL_IDS.map((panelId) => {
            const meta = WAR_ROOM_PANELS[panelId];
            const visible = isWarRoomPanelVisible(warRoomLayout, panelId);
            const zoneId = findPanelZone(warRoomLayout, panelId);
            const isActiveInZone =
              visible && warRoomLayout.zones[zoneId].activePanelId === panelId;

            return (
              <button
                key={panelId}
                type="button"
                data-testid={`war-room-panel-toggle-${panelId}`}
                aria-pressed={visible}
                title={`${meta.title} (${meta.purpose}) — Docked in ${zoneId.toUpperCase()} zone`}
                onClick={() => handlePanelButtonClick(panelId)}
                className={`px-2 py-1 rounded-[2px] text-[11px] font-mono transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-[#00ffa3] ${
                  isActiveInZone
                    ? "bg-[#003322] border border-[#00ffa3] text-[#00ffa3] font-semibold"
                    : visible
                    ? "bg-[#141923] border border-[#e4e6eb]/25 text-white hover:border-[#00ffa3]/60"
                    : "bg-black border border-white/10 text-slate-500 hover:text-slate-300"
                }`}
              >
                <span className="tabular-nums text-[10px] opacity-75">{meta.number}.</span>
                <span>{meta.shortTitle}</span>
                <span className="text-[9px] uppercase opacity-65">
                  [{ZONE_SHORT_LABEL[zoneId]}]
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
