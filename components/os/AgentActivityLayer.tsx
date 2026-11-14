"use client";

import React from "react";
import { Pause, Play, Radio, Sparkles } from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";
import { getStatusVisual } from "@/components/os/AgentDockV2";

export default function AgentActivityLayer() {
  const {
    agents,
    activityFeed,
    simulationLive,
    setSimulationLive,
    summonAgent,
    setTerminalExpanded,
  } = useAgentOS();

  const counts = {
    planning: agents.filter((a) => a.status === "planning").length,
    executing: agents.filter((a) => a.status === "executing").length,
    reviewing: agents.filter((a) => a.status === "reviewing").length,
    completed: agents.filter((a) => a.status === "completed").length,
  };

  const latest = activityFeed[0];
  const latestVis = latest ? getStatusVisual(latest.status) : getStatusVisual("idle");

  return (
    <section
      aria-label="Live Agent Presence Layer"
      data-testid="agent-activity-layer"
      className="shrink-0 h-9 px-4 md:px-6 bg-[#0e1117] border-b border-white/10 flex items-center justify-between gap-4 text-xs overflow-hidden"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span className="inline-flex items-center gap-1.5 font-medium text-[#e4e6eb] whitespace-nowrap shrink-0">
          <Radio
            className={`w-3.5 h-3.5 ${simulationLive ? "text-[#00ffa3]" : "text-slate-500"}`}
            aria-hidden="true"
          />
          <span>Agent Presence</span>
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
            <span className="text-slate-300 truncate">{latest.task}</span>
            <span className="hidden xl:inline font-mono text-[11px] text-slate-400 whitespace-nowrap shrink-0">
              · {latest.provider}
            </span>
          </button>
        ) : (
          <span className="text-slate-400">Waiting for agent activity...</span>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] tabular-nums text-slate-400">
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
          onClick={() => setSimulationLive(!simulationLive)}
          aria-pressed={simulationLive}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161b24] border border-white/10 hover:border-white/25 text-[11px] text-[#e4e6eb] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
        >
          {simulationLive ? (
            <>
              <Pause className="w-3 h-3 text-[#00ffa3]" aria-hidden="true" />
              <span>Pause Stream</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 text-slate-300" aria-hidden="true" />
              <span>Resume Stream</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTerminalExpanded(true)}
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161b24] border border-white/10 hover:border-[#00ffa3]/40 text-[11px] text-[#e4e6eb] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
        >
          <Sparkles className="w-3 h-3 text-[#00ffa3]" aria-hidden="true" />
          <span>Dispatch Command</span>
        </button>
      </div>
    </section>
  );
}
