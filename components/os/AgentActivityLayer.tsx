"use client";

import React from "react";
import { Pause, Play, Radio, Sparkles, Users } from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";
import { getStatusVisual } from "@/components/os/AgentDockV2";

export default function AgentActivityLayer() {
  const {
    agents,
    activityFeed,
    wsStatus,
    streamPaused,
    setStreamPaused,
    summonAgent,
    setTerminalExpanded,
    conveneCouncil,
  } = useAgentOS();

  const counts = {
    planning: agents.filter((a) => a.status === "planning").length,
    executing: agents.filter((a) => a.status === "executing").length,
    reviewing: agents.filter((a) => a.status === "reviewing").length,
    completed: agents.filter((a) => a.status === "completed").length,
  };

  const latest = activityFeed[0];
  const latestVis = latest ? getStatusVisual(latest.status) : getStatusVisual("idle");
  const wsConnected = wsStatus === "connected";

  return (
    <section
      aria-label="Live Agent Presence Layer"
      data-testid="agent-activity-layer"
      className="shrink-0 h-9 px-4 md:px-6 bg-[#0e1117] border-b border-white/10 flex items-center justify-between gap-4 text-xs overflow-hidden"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span
          data-testid="ws-presence-indicator"
          className="inline-flex items-center gap-1.5 font-medium text-[#e4e6eb] whitespace-nowrap shrink-0"
        >
          <Radio
            className={`w-3.5 h-3.5 ${
              wsConnected
                ? "text-[#00ffa3]"
                : wsStatus === "connecting"
                ? "text-sky-400"
                : "text-amber-400"
            }`}
            aria-hidden="true"
          />
          <span>
            {wsConnected
              ? "WS Live"
              : wsStatus === "connecting"
              ? "WS Connecting"
              : "WS Reconnecting"}
          </span>
        </span>

        <span className="text-slate-500 shrink-0" aria-hidden="true">
          ·
        </span>

        {latest ? (
          <button
            type="button"
            onClick={() => summonAgent(latest.agentId)}
            className="flex items-center gap-2 flex-1 min-w-0 text-left hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
          >
            <span className={`font-semibold ${latestVis.textClass} whitespace-nowrap shrink-0`}>
              {latest.agentName} ({latestVis.label})
            </span>
            <span className="text-slate-200 truncate">{latest.task}</span>
            {latest.workflowType && (
              <span className="hidden lg:inline font-mono text-[11px] text-sky-300 whitespace-nowrap shrink-0">
                · {latest.workflowType}
              </span>
            )}
            <span className="hidden xl:inline font-mono text-[11px] text-slate-400 whitespace-nowrap shrink-0">
              · {latest.provider}
            </span>
          </button>
        ) : (
          <span className="text-slate-400">Subscribed to Event SDK WebSocket...</span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-2.5 font-mono text-[11px] tabular-nums text-slate-400">
          <span className="text-sky-400">{counts.planning} Planning</span>
          <span aria-hidden="true">·</span>
          <span className="text-[#00ffa3]">{counts.executing} Executing</span>
          <span aria-hidden="true">·</span>
          <span className="text-violet-400">{counts.reviewing} Reviewing</span>
          <span aria-hidden="true">·</span>
          <span className="text-teal-300">{counts.completed} Completed</span>
        </div>

        <button
          type="button"
          onClick={() => {
            void conveneCouncil("Evaluate live project readiness and architecture gates");
            summonAgent("jarvis");
          }}
          className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161b24] border border-white/10 hover:border-sky-400/40 text-[11px] text-[#e4e6eb] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
        >
          <Users className="w-3 h-3 text-sky-400" aria-hidden="true" />
          <span>Convene Council</span>
        </button>

        <button
          type="button"
          onClick={() => setStreamPaused(!streamPaused)}
          aria-pressed={streamPaused}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161b24] border border-white/10 hover:border-white/25 text-[11px] text-[#e4e6eb] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
        >
          {streamPaused ? (
            <>
              <Play className="w-3 h-3 text-slate-300" aria-hidden="true" />
              <span>Resume Feed</span>
            </>
          ) : (
            <>
              <Pause className="w-3 h-3 text-[#00ffa3]" aria-hidden="true" />
              <span>Pause Feed</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTerminalExpanded(true)}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161b24] border border-white/10 hover:border-[#00ffa3]/40 text-[11px] text-[#e4e6eb] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
        >
          <Sparkles className="w-3 h-3 text-[#00ffa3]" aria-hidden="true" />
          <span>Dispatch</span>
        </button>
      </div>
    </section>
  );
}
