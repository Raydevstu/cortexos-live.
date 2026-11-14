"use client";

import React from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  Cpu,
  Eye,
  Layers,
  PauseCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";
import {
  deriveAgentTeammateTelemetry,
  type AgentLifecycleStatus,
  type DockAgentState,
} from "@/lib/agent-os-logic";

const STATUS_STYLE: Record<
  AgentLifecycleStatus,
  { label: string; textClass: string; barClass: string; borderClass: string }
> = {
  idle: {
    label: "Idle",
    textClass: "text-slate-400",
    barClass: "bg-slate-500",
    borderClass: "border-white/10",
  },
  planning: {
    label: "Planning",
    textClass: "text-sky-400",
    barClass: "bg-sky-400",
    borderClass: "border-sky-400/40",
  },
  executing: {
    label: "Executing",
    textClass: "text-[#00ffa3]",
    barClass: "bg-[#00ffa3]",
    borderClass: "border-[#00ffa3]/50",
  },
  reviewing: {
    label: "Reviewing",
    textClass: "text-violet-400",
    barClass: "bg-violet-400",
    borderClass: "border-violet-400/45",
  },
  completed: {
    label: "Completed",
    textClass: "text-teal-300",
    barClass: "bg-teal-400",
    borderClass: "border-teal-400/40",
  },
  blocked: {
    label: "Blocked",
    textClass: "text-rose-400",
    barClass: "bg-rose-400",
    borderClass: "border-rose-400/50",
  },
  failed: {
    label: "Failed",
    textClass: "text-orange-400",
    barClass: "bg-orange-400",
    borderClass: "border-orange-400/50",
  },
};

function StatusGlyph({ status }: { status: AgentLifecycleStatus }) {
  switch (status) {
    case "planning":
      return <Layers className="w-3 h-3 text-sky-400 shrink-0" aria-hidden="true" />;
    case "executing":
      return <Activity className="w-3 h-3 text-[#00ffa3] shrink-0" aria-hidden="true" />;
    case "reviewing":
      return <Eye className="w-3 h-3 text-violet-400 shrink-0" aria-hidden="true" />;
    case "completed":
      return <CheckCircle2 className="w-3 h-3 text-teal-300 shrink-0" aria-hidden="true" />;
    case "blocked":
      return <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" aria-hidden="true" />;
    case "failed":
      return <XCircle className="w-3 h-3 text-orange-400 shrink-0" aria-hidden="true" />;
    default:
      return <PauseCircle className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />;
  }
}

export function getStatusVisual(status: AgentLifecycleStatus) {
  return STATUS_STYLE[status] ?? STATUS_STYLE.idle;
}

function AgentTelemetryPopover({
  agent,
  recentDecisions,
  toolUsageSummary,
}: {
  agent: DockAgentState;
  recentDecisions: string[];
  toolUsageSummary: string;
}) {
  const vis = getStatusVisual(agent.status);
  return (
    <div
      role="region"
      aria-label={`${agent.name} live teammate telemetry`}
      className="mt-2 w-96 rounded-md bg-[#11151d] border border-white/15 p-3.5 text-left shadow-2xl z-50"
    >
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-4 h-4 text-[#00ffa3] shrink-0" aria-hidden="true" />
          <span className="font-semibold text-sm text-[#e4e6eb] truncate">{agent.name}</span>
          <span className="text-xs text-slate-400 truncate">· {agent.role}</span>
        </div>
        <span className={`font-mono text-xs font-semibold ${vis.textClass} whitespace-nowrap`}>
          {vis.label}
        </span>
      </div>

      <dl className="mt-2.5 space-y-1.5 text-xs">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-400 shrink-0">Current Workflow</dt>
          <dd className="font-mono text-sky-300 text-right truncate">{agent.currentWorkflow}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-400 shrink-0">Current Task</dt>
          <dd className="text-[#e4e6eb] text-right leading-snug">{agent.currentTask}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-400 shrink-0">Current Artifact</dt>
          <dd className="text-teal-300 text-right truncate">{agent.currentArtifact || agent.lastArtifact}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-400 shrink-0">Health</dt>
          <dd className="font-mono tabular-nums text-[#00ffa3]">{agent.health}%</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-400 shrink-0">Provider</dt>
          <dd className="font-mono text-slate-300 truncate">
            {agent.provider} · {agent.model}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-400 shrink-0">Tool Usage</dt>
          <dd className="font-mono text-amber-300 text-right truncate">{toolUsageSummary}</dd>
        </div>
        <div className="pt-1 border-t border-white/10 space-y-1">
          <dt className="text-slate-400">Recent Decisions</dt>
          {recentDecisions.slice(0, 2).map((dec, idx) => (
            <dd key={idx} className="text-slate-200 leading-snug truncate">
              · {dec}
            </dd>
          ))}
        </div>
      </dl>

      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
        <span>Click to summon teammate workspace</span>
        <span className="font-mono tabular-nums">Load {agent.workload}%</span>
      </div>
    </div>
  );
}

export default function AgentDockV2() {
  const {
    agents,
    workspaces,
    inspectedAgentId,
    setInspectedAgentId,
    summonAgent,
    toolActivityFeed,
    decisionFeed,
  } = useAgentOS();

  const inspectedAgent = agents.find((a) => a.id === inspectedAgentId) ?? null;
  const inspectedTelemetry = inspectedAgent
    ? deriveAgentTeammateTelemetry(inspectedAgent, toolActivityFeed, decisionFeed)
    : null;

  return (
    <nav
      aria-label="Agent Dock Teammate Navigation"
      data-testid="agent-dock-v2"
      className="relative flex-1 min-w-0 flex items-center justify-center"
      onMouseLeave={() => setInspectedAgentId(null)}
    >
      <div className="flex items-center gap-1 overflow-x-auto py-1 px-1 no-scrollbar">
        {agents.map((agent) => {
          const vis = getStatusVisual(agent.status);
          const isSummoned = workspaces.some(
            (w) => w.agentId === agent.id && w.mode !== "docked"
          );
          const isInspected = inspectedAgentId === agent.id;
          const telemetry = deriveAgentTeammateTelemetry(
            agent,
            toolActivityFeed,
            decisionFeed
          );

          return (
            <button
              key={agent.id}
              type="button"
              data-testid={`dock-agent-${agent.id}`}
              aria-label={`Summon ${agent.name} teammate — ${vis.label}, ${agent.health}% health, ${agent.provider}`}
              aria-pressed={isSummoned}
              title={`${agent.name} (${agent.role}) · Workflow: ${agent.currentWorkflow} · Task: ${agent.currentTask} · Artifact: ${agent.currentArtifact} · Health: ${agent.health}% · Provider: ${agent.provider} · Tool: ${telemetry.toolUsageSummary} · Decision: ${agent.lastDecision}`}
              onClick={() => {
                setInspectedAgentId(null);
                summonAgent(agent.id);
              }}
              onMouseEnter={() => setInspectedAgentId(agent.id)}
              onFocus={() => setInspectedAgentId(agent.id)}
              onBlur={() => setInspectedAgentId(null)}
              className={`group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00ffa3] ${
                isSummoned
                  ? "bg-[#00ffa3]/12 border-[#00ffa3] text-[#e4e6eb]"
                  : isInspected
                  ? `bg-[#161b24] ${vis.borderClass} text-white`
                  : "bg-[#11141a] border-white/10 text-[#e4e6eb]/85 hover:bg-[#161b24] hover:border-white/25"
              }`}
            >
              <StatusGlyph status={agent.status} />
              <span className="text-xs font-medium tracking-tight">{agent.name}</span>
              <span
                aria-hidden="true"
                className={`absolute inset-x-2 bottom-0 h-[2px] rounded-full ${vis.barClass} ${
                  agent.status === "idle" ? "opacity-30" : "opacity-95"
                }`}
              />
            </button>
          );
        })}
      </div>

      {inspectedAgent && inspectedTelemetry && (
        <div className="hidden lg:block absolute top-full left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <AgentTelemetryPopover
            agent={inspectedAgent}
            recentDecisions={inspectedTelemetry.recentDecisions}
            toolUsageSummary={inspectedTelemetry.toolUsageSummary}
          />
        </div>
      )}
    </nav>
  );
}

export function AgentDockRosterStrip() {
  const { agents, summonAgent, toolActivityFeed, decisionFeed } = useAgentOS();
  return (
    <div
      data-testid="agent-dock-roster"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5"
    >
      {agents.map((agent) => {
        const vis = getStatusVisual(agent.status);
        const telemetry = deriveAgentTeammateTelemetry(
          agent,
          toolActivityFeed,
          decisionFeed
        );
        return (
          <button
            key={agent.id}
            type="button"
            data-testid={`roster-agent-${agent.id}`}
            onClick={() => summonAgent(agent.id)}
            className="text-left px-3.5 py-2.5 rounded-md bg-[#11141a] border border-white/10 hover:border-[#00ffa3]/50 transition-colors focus-visible:outline-2 focus-visible:outline-[#00ffa3] space-y-1.5 min-w-0 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                <StatusGlyph status={agent.status} />
                <span className="text-xs font-semibold text-[#e4e6eb] whitespace-nowrap shrink-0">
                  {agent.name}
                </span>
                <span className="text-[11px] text-slate-400 truncate min-w-0">
                  · {agent.role}
                </span>
              </div>
              <span className={`font-mono text-[11px] font-medium ${vis.textClass} shrink-0 whitespace-nowrap`}>
                {vis.label} · {agent.health}%
              </span>
            </div>

            <div className="text-xs text-[#e4e6eb] truncate" title={agent.currentTask}>
              <span className="text-slate-400">Task: </span>
              {agent.currentTask}
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400 min-w-0">
              <span className="text-sky-300 truncate min-w-0" title={agent.currentWorkflow}>
                Workflow: {agent.currentWorkflow}
              </span>
              <span className="text-teal-300 truncate max-w-[50%] text-right" title={agent.currentArtifact || agent.lastArtifact}>
                {agent.currentArtifact || agent.lastArtifact}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400 min-w-0">
              <span className="flex items-center gap-1 shrink-0 whitespace-nowrap text-slate-300">
                <Cpu className="w-3 h-3 shrink-0" aria-hidden="true" />
                {agent.provider} · {agent.model}
              </span>
              <span className="text-amber-300 truncate text-right" title={telemetry.toolUsageSummary}>
                Tool: {telemetry.toolUsageSummary}
              </span>
            </div>

            <div className="text-[11px] text-slate-300 truncate pt-1 border-t border-white/5" title={telemetry.recentDecisions[0]}>
              <span className="text-slate-400">Decision: </span>
              {telemetry.recentDecisions[0]}
            </div>
          </button>
        );
      })}
    </div>
  );
}
