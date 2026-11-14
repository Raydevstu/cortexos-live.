"use client";

import React, { useState } from "react";
import {
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  PanelBottom,
  X,
  Bot,
  Cpu,
  Terminal,
  BookOpen,
  Layers,
  Wrench,
  Scale,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  deriveWorkspaceIntelligence,
  type DockAgentState,
  type WorkspaceWindowState,
} from "@/lib/agent-os-logic";
import { useAgentOS } from "@/lib/agent-os-store";
import { getStatusVisual } from "@/components/os/AgentDockV2";

interface AgentWorkspaceProps {
  windowState: WorkspaceWindowState;
  agent: DockAgentState;
  onPinToggle: () => void;
  onDock: () => void;
  onFocusToggle: () => void;
  onClose: () => void;
  onRunInTerminal?: (command: string) => void;
  children: React.ReactNode;
}

export default function AgentWorkspace({
  windowState,
  agent,
  onPinToggle,
  onDock,
  onFocusToggle,
  onClose,
  onRunInTerminal,
  children,
}: AgentWorkspaceProps) {
  const {
    agents,
    workRequests,
    workflows,
    artifactFeed,
    knowledgeFeed,
    toolActivityFeed,
    decisionFeed,
    setMainBrainView,
  } = useAgentOS();

  const [intelExpanded, setIntelExpanded] = useState(true);

  const vis = getStatusVisual(agent.status);
  const isPinned = windowState.mode === "pinned";
  const isFocused = windowState.mode === "focused";

  const intel = deriveWorkspaceIntelligence(agent.id, {
    agents,
    workRequests,
    workflows,
    artifactFeed,
    knowledgeFeed,
    toolActivityFeed,
    decisionFeed,
  });

  return (
    <section
      aria-label={`${windowState.title} Workspace`}
      data-testid={`workspace-${windowState.agentId}`}
      className="flex flex-col h-full bg-[#0f131a] text-[#e4e6eb] border-l border-white/15 overflow-hidden"
    >
      {/* Workspace OS Chrome Header */}
      <header className="shrink-0 px-4 py-3 bg-[#131822] border-b border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Bot className="w-4 h-4 text-[#00ffa3] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white truncate">
                  {windowState.title}
                </h2>
                <span className={`font-mono text-[11px] font-medium ${vis.textClass} shrink-0`}>
                  {vis.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {windowState.subtitle} · {agent.provider} · {agent.model} · {agent.health}% health
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onPinToggle}
              aria-pressed={isPinned}
              aria-label={isPinned ? `Unpin ${windowState.title}` : `Pin ${windowState.title}`}
              title={isPinned ? "Unpin workspace" : "Pin workspace alongside MainBrain"}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#00ffa3] ${
                isPinned
                  ? "bg-[#00ffa3]/15 border-[#00ffa3] text-[#00ffa3]"
                  : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
              }`}
            >
              {isPinned ? (
                <PinOff className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Pin className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{isPinned ? "Pinned" : "Pin"}</span>
            </button>

            <button
              type="button"
              onClick={onDock}
              aria-label={`Dock ${windowState.title}`}
              title="Minimize to bottom dock tray"
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
            >
              <PanelBottom className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Dock</span>
            </button>

            <button
              type="button"
              onClick={onFocusToggle}
              aria-pressed={isFocused}
              aria-label={isFocused ? `Exit focus for ${windowState.title}` : `Focus ${windowState.title}`}
              title={isFocused ? "Restore drawer size" : "Expand to focused view"}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#00ffa3] ${
                isFocused
                  ? "bg-[#00ffa3]/15 border-[#00ffa3] text-[#00ffa3]"
                  : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
              }`}
            >
              {isFocused ? (
                <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>Focus</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${windowState.title}`}
              title="Slide out workspace"
              className="inline-flex items-center justify-center p-1.5 rounded bg-white/5 border border-white/10 text-slate-300 hover:text-rose-300 hover:border-rose-400/40 transition-colors focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Synchronized MainBrain Workspace Intelligence Header Strip */}
        <div
          data-testid={`workspace-intelligence-${agent.id}`}
          className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5 text-[11px]"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-[#00ffa3] flex items-center gap-1.5">
              <Cpu className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>MainBrain Workspace Intelligence (Synchronized)</span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {onRunInTerminal && (
                <button
                  type="button"
                  onClick={() =>
                    onRunInTerminal(`@${agent.id} inspect current state and propose next action`)
                  }
                  className="inline-flex items-center gap-1 text-[11px] text-[#00ffa3] hover:underline whitespace-nowrap"
                >
                  <Terminal className="w-3 h-3" aria-hidden="true" />
                  <span>Send to Terminal</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIntelExpanded(!intelExpanded)}
                aria-expanded={intelExpanded}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
              >
                <span>{intelExpanded ? "Hide Intel" : "Show Intel"}</span>
                {intelExpanded ? (
                  <ChevronUp className="w-3 h-3" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3 h-3" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* 1. Current Work & 2. Current Workflow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-300">
            <div className="truncate" title={intel.currentWork}>
              <span className="text-slate-400">Current Work: </span>
              <span className="text-white font-medium">{intel.currentWork}</span>
            </div>
            <div className="font-mono truncate sm:text-right" title={intel.currentWorkflow}>
              <span className="text-slate-400">Workflow: </span>
              <span className="text-sky-300">{intel.currentWorkflow}</span>
            </div>
          </div>

          {intelExpanded && (
            <div className="pt-2 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {/* 3. Generated Artifacts */}
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="inline-flex items-center gap-1 font-medium text-teal-300">
                    <Layers className="w-3 h-3" aria-hidden="true" />
                    <span>Generated Artifacts ({intel.generatedArtifacts.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMainBrainView("artifacts")}
                    className="text-[10px] text-slate-400 hover:text-[#00ffa3] underline"
                  >
                    View in Brain
                  </button>
                </div>
                <div className="text-slate-200 truncate">
                  {intel.generatedArtifacts[0]?.title ?? agent.currentArtifact ?? agent.lastArtifact}
                </div>
              </div>

              {/* 4. Relevant Knowledge */}
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="inline-flex items-center gap-1 font-medium text-sky-300">
                    <BookOpen className="w-3 h-3" aria-hidden="true" />
                    <span>Relevant Knowledge ({intel.relevantKnowledge.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMainBrainView("knowledge")}
                    className="text-[10px] text-slate-400 hover:text-[#00ffa3] underline"
                  >
                    View in Brain
                  </button>
                </div>
                <div className="text-slate-200 truncate">
                  {intel.relevantKnowledge[0]?.title ?? "6-Layer Context Injection Stack"}
                </div>
              </div>

              {/* 5. Tool Activity */}
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="inline-flex items-center gap-1 font-medium text-amber-300">
                    <Wrench className="w-3 h-3" aria-hidden="true" />
                    <span>Tool Activity ({intel.toolActivity.length})</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                    {intel.toolActivity[0] ? `${intel.toolActivity[0].executionTimeMs}ms` : "ready"}
                  </span>
                </div>
                <div className="font-mono text-slate-200 truncate">
                  {intel.toolActivity[0]
                    ? `${intel.toolActivity[0].toolName} -> ${intel.toolActivity[0].artifactProduced}`
                    : `Bound: ${agent.tools.slice(0, 3).join(", ")}`}
                </div>
              </div>

              {/* 6. Recent Decisions */}
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="inline-flex items-center gap-1 font-medium text-violet-300">
                    <Scale className="w-3 h-3" aria-hidden="true" />
                    <span>Recent Decisions ({intel.recentDecisions.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMainBrainView("decisions")}
                    className="text-[10px] text-slate-400 hover:text-[#00ffa3] underline"
                  >
                    View in Brain
                  </button>
                </div>
                <div className="text-slate-200 truncate">
                  {intel.recentDecisions[0]?.title ?? agent.lastDecision}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Scrollable Workspace Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">{children}</div>
    </section>
  );
}

