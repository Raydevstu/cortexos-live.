"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, Compass, FileSearch, ShieldAlert, Send } from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";
import type { DockAgentId } from "@/lib/agent-os-logic";

const PHASE_CHAIN: DockAgentId[] = [
  "discovery",
  "product",
  "design",
  "architecture",
  "development",
  "qa",
  "release",
];

export default function JarvisWorkspace() {
  const {
    agents,
    activeProject,
    advanceProjectPhase,
    summonAgent,
    summonUtilityWorkspace,
    runTerminalCommand,
    setIsBlueprintOpen,
  } = useAgentOS();

  const [dispatchStudio, setDispatchStudio] = useState<DockAgentId>("design");
  const [dispatchObjective, setDispatchObjective] = useState(
    "Audit accessibility tokens and confirm Architecture handoff readiness"
  );

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchObjective.trim()) return;
    await runTerminalCommand(`@${dispatchStudio} ${dispatchObjective.trim()}`, dispatchStudio);
  };

  return (
    <div className="space-y-6">
      {/* Supervisor Context */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Supervisor Orchestration · {activeProject.name}
        </h3>
        <p className="mt-1.5 text-sm text-[#e4e6eb] leading-relaxed">
          {activeProject.objective}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Readiness: {activeProject.readinessSummary}
        </p>
      </div>

      {/* Phase Pipeline Control */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Lifecycle Phase Progression
          </h3>
          <span className="font-mono text-xs text-[#00ffa3]">
            Active: {activeProject.phase}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PHASE_CHAIN.map((phaseId) => {
            const isCurrent = activeProject.phase === phaseId;
            return (
              <button
                key={phaseId}
                type="button"
                onClick={() => advanceProjectPhase(phaseId)}
                className={`px-2.5 py-1.5 rounded text-xs capitalize border transition-colors whitespace-nowrap ${
                  isCurrent
                    ? "bg-[#00ffa3] text-black border-[#00ffa3] font-semibold"
                    : "bg-[#141923] border-white/10 text-slate-300 hover:border-white/30 hover:text-white"
                }`}
              >
                {phaseId}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dispatch WorkRequest to Studio */}
      <form
        onSubmit={handleDispatch}
        className="pt-4 border-t border-white/10 space-y-3"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Dispatch Studio WorkRequest
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="text-xs text-slate-300">
            Target Studio
            <select
              value={dispatchStudio}
              onChange={(e) => setDispatchStudio(e.target.value as DockAgentId)}
              className="mt-1 w-full px-2.5 py-2 rounded bg-[#0b0e14] border border-white/15 text-xs text-[#e4e6eb]"
            >
              {PHASE_CHAIN.map((id) => (
                <option key={id} value={id}>
                  {id.charAt(0).toUpperCase() + id.slice(1)} Studio
                </option>
              ))}
              <option value="librarian">Chief Librarian</option>
            </select>
          </label>

          <label className="sm:col-span-2 text-xs text-slate-300">
            WorkRequest Objective
            <input
              type="text"
              value={dispatchObjective}
              onChange={(e) => setDispatchObjective(e.target.value)}
              placeholder="Specify objective and deliverables..."
              className="mt-1 w-full px-3 py-2 rounded bg-[#0b0e14] border border-white/15 text-xs text-[#e4e6eb]"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#00ffa3] text-black text-xs font-semibold hover:brightness-110 transition-all"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Dispatch via Agent Mesh</span>
          </button>

          <button
            type="button"
            onClick={() => summonAgent(dispatchStudio)}
            className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white"
          >
            <span>Open {dispatchStudio} studio</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </form>

      {/* Active Studio Roster Snapshot */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
          Live Studio Health & Routing
        </h3>
        <div className="divide-y divide-white/10 border border-white/10 rounded-md bg-[#0b0e14]">
          {agents
            .filter((a) => a.id !== "jarvis")
            .map((a) => (
              <div
                key={a.id}
                className="px-3 py-2 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-medium text-[#e4e6eb]">{a.name}</span>
                  <span className="text-slate-400 ml-2 truncate">· {a.currentTask}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 font-mono text-[11px] tabular-nums">
                  <span className="text-slate-400">{a.status}</span>
                  <span className="text-teal-300">{a.health}%</span>
                  <button
                    type="button"
                    onClick={() => summonAgent(a.id)}
                    className="text-[#00ffa3] hover:underline font-sans"
                  >
                    Summon
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Summonable Governance & Inspection Tools (No separate pages!) */}
      <div className="pt-4 border-t border-white/10">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
          Summon Governance & Audit Consoles
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() =>
              summonUtilityWorkspace(
                "audit",
                "4C Audit Engine",
                "Foundation Layer Integrity & Staleness"
              )
            }
            className="flex items-center gap-2 p-2.5 rounded bg-[#141923] border border-white/10 hover:border-[#00ffa3]/50 text-left text-xs"
          >
            <ShieldAlert className="w-4 h-4 text-[#00ffa3] shrink-0" aria-hidden="true" />
            <div>
              <div className="font-semibold text-white">4C Audit Engine</div>
              <div className="text-[11px] text-slate-400">Summon as workspace</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              summonUtilityWorkspace(
                "grillme",
                "Grill-Me Stress Test",
                "Adversarial Architectural Interrogation"
              )
            }
            className="flex items-center gap-2 p-2.5 rounded bg-[#141923] border border-white/10 hover:border-[#00ffa3]/50 text-left text-xs"
          >
            <Compass className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
            <div>
              <div className="font-semibold text-white">Grill-Me Stress Test</div>
              <div className="text-[11px] text-slate-400">Challenge assumptions</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsBlueprintOpen(true)}
            className="flex items-center gap-2 p-2.5 rounded bg-[#141923] border border-white/10 hover:border-[#00ffa3]/50 text-left text-xs"
          >
            <FileSearch className="w-4 h-4 text-violet-400 shrink-0" aria-hidden="true" />
            <div>
              <div className="font-semibold text-white">Architecture Blueprint</div>
              <div className="text-[11px] text-slate-400">SDK & Service spec</div>
            </div>
          </button>
        </div>
      </div>

      <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-400">
        <CheckCircle2 className="w-3.5 h-3.5 text-teal-300 shrink-0" aria-hidden="true" />
        <span>All cross-studio handoffs remain gated by Jarvis Supervisor.</span>
      </div>
    </div>
  );
}
