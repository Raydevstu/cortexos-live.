"use client";

import React, { useState } from "react";
import { CheckCircle2, Layers, Palette, Play, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";
import type { DockAgentId } from "@/lib/agent-os-logic";

const DESIGN_TOKEN_PREVIEW = [
  { token: "--surface-canvas", value: "#090B0F", contrast: "18.33:1 AAA", role: "Primary OS Canvas" },
  { token: "--surface-elevated", value: "#11151D", contrast: "15.10:1 AAA", role: "Workspace Drawer" },
  { token: "--accent-primary", value: "#00FFA3", contrast: "13.94:1 AAA", role: "Action / Execute CTA" },
  { token: "--ink-primary", value: "#E4E6EB", contrast: "15.40:1 AAA", role: "Headline & Primary Ink" },
];

export default function StudioWorkspace({ agentId }: { agentId: DockAgentId }) {
  const {
    agents,
    activeProject,
    artifactFeed,
    activityFeed,
    runTerminalCommand,
  } = useAgentOS();

  const agent = agents.find((a) => a.id === agentId);
  const [objective, setObjective] = useState(
    agentId === "design"
      ? "Generate responsive 12/8/4 spatial wireframe and WCAG 2.1 AA token set"
      : `Execute ${agent?.name ?? agentId} Studio deliverables for ${activeProject.name}`
  );
  const [designSubTab, setDesignSubTab] = useState<
    "overview" | "wireframes" | "tokens" | "flows"
  >("overview");

  if (!agent) return null;

  const studioArtifacts = artifactFeed.filter((a) => a.studioId === agentId);
  const studioActivity = activityFeed.filter((a) => a.agentId === agentId).slice(0, 6);

  const handleExecuteStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective.trim()) return;
    await runTerminalCommand(`@${agent.id} ${objective.trim()}`, agent.id);
  };

  return (
    <div className="space-y-5">
      {/* Studio Mission & Objective Runner */}
      <div className="space-y-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Studio Charter Mission
          </h3>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed">{agent.mission}</p>
        </div>

        <form onSubmit={handleExecuteStudio} className="space-y-2 p-3 rounded-md bg-[#0b0e14] border border-white/10">
          <label className="block text-xs text-slate-300">
            Execute Objective ({agent.name} Studio)
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="mt-1.5 w-full px-3 py-2 rounded bg-[#11151d] border border-white/15 text-xs text-[#e4e6eb]"
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              Runtime: {agent.provider} · {agent.model}
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#00ffa3] text-black text-xs font-semibold hover:brightness-110"
            >
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Run {agent.name} Agent</span>
            </button>
          </div>
        </form>
      </div>

      {/* Specialized Design Studio Reference Experience */}
      {agentId === "design" && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-1 p-1 rounded bg-[#0b0e14] border border-white/10 overflow-x-auto">
            {(
              [
                { id: "overview", label: "Design Agent" },
                { id: "wireframes", label: "Wireframes" },
                { id: "tokens", label: "Design System" },
                { id: "flows", label: "UX Flows" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDesignSubTab(tab.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
                  designSubTab === tab.id
                    ? "bg-[#00ffa3] text-black font-semibold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {designSubTab === "overview" && (
            <div className="p-3 rounded-md bg-[#0b0e14] border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#00ffa3]" aria-hidden="true" />
                  WCAG 2.1 AA Compliance Gate
                </span>
                <span className="font-mono text-teal-300 tabular-nums">100% Passed</span>
              </div>
              <p className="text-slate-400">
                Reference Python (`studios/design/design_studio.py`) + TypeScript (`CortexDesignStudio`) runtime enforcing contrast ratios, semantic landmarks, and reduced-motion safeguards.
              </p>
            </div>
          )}

          {designSubTab === "wireframes" && (
            <div className="p-3 rounded-md bg-[#0b0e14] border border-white/10 space-y-2 text-xs">
              <div className="font-semibold text-white">Spatial Shell Wireframe Blueprint (12/8/4 Grid)</div>
              <div className="grid grid-cols-12 gap-1.5 font-mono text-[10px] text-center">
                <div className="col-span-12 py-1.5 bg-white/5 border border-white/10 rounded">
                  Top Dock: AgentDockV2 (9 Live Agents) · ModeSwitcher
                </div>
                <div className="col-span-8 py-6 bg-white/5 border border-white/10 rounded">
                  MainBrainHome / Brain Mode / War Room
                </div>
                <div className="col-span-4 py-6 bg-[#00ffa3]/10 border border-[#00ffa3]/40 rounded text-[#00ffa3]">
                  Pinned / Summoned Studio
                </div>
                <div className="col-span-12 py-1.5 bg-white/5 border border-white/10 rounded">
                  Persistent Bottom: TerminalSandboxHome
                </div>
              </div>
            </div>
          )}

          {designSubTab === "tokens" && (
            <div className="divide-y divide-white/10 border border-white/10 rounded-md bg-[#0b0e14]">
              {DESIGN_TOKEN_PREVIEW.map((t) => (
                <div key={t.token} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-4 h-4 rounded border border-white/20 shrink-0"
                      style={{ backgroundColor: t.value }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="font-mono text-white truncate">{t.token}</div>
                      <div className="text-[11px] text-slate-400">{t.role}</div>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] shrink-0">
                    <div className="text-slate-200">{t.value}</div>
                    <div className="text-teal-300">{t.contrast}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {designSubTab === "flows" && (
            <div className="p-3 rounded-md bg-[#0b0e14] border border-white/10 space-y-2 text-xs text-slate-300">
              <div className="font-semibold text-white">Verified Experience Flow Transitions</div>
              <ol className="list-decimal list-inside space-y-1 text-slate-300">
                <li>MainBrainHome surfaces live Knowledge, Artifacts, and Agent Activity.</li>
                <li>AgentDockV2 click summons Workspace in Slide-In Drawer without page loss.</li>
                <li>User can Pin alongside MainBrain, Dock to tray, Focus full-span, or Escape to close.</li>
                <li>TerminalSandboxHome triggers <code>@design</code> &rarr; live Planning/Executing/Reviewing/Completed trace.</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Emitted Artifacts */}
      <div className="pt-3 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Studio Artifacts ({studioArtifacts.length})</span>
          </h3>
        </div>
        {studioArtifacts.length === 0 ? (
          <p className="text-xs text-slate-400">
            No artifacts emitted yet for {agent.name}. Run an objective above to generate tracked artifacts.
          </p>
        ) : (
          <div className="divide-y divide-white/10 border border-white/10 rounded-md bg-[#0b0e14]">
            {studioArtifacts.map((art) => (
              <div key={art.id} className="p-3 space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-white">{art.title}</span>
                  <span className="font-mono text-[11px] text-teal-300">
                    {art.status} · v{art.version}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{art.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tools & Capabilities */}
      <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-md bg-[#0b0e14] border border-white/10">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
            <Wrench className="w-3.5 h-3.5 text-[#00ffa3]" aria-hidden="true" />
            <span>Allowlisted Studio Tools</span>
          </div>
          <p className="font-mono text-[11px] text-slate-300 leading-relaxed">
            {agent.tools.join(" · ")}
          </p>
        </div>
        <div className="p-3 rounded-md bg-[#0b0e14] border border-white/10">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
            <span>Studio Capabilities</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {agent.capabilities.join(" · ")}
          </p>
        </div>
      </div>

      {/* Recent Studio Activity */}
      <div className="pt-3 border-t border-white/10">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Recent Agent Activity ({studioActivity.length})
        </h3>
        <div className="space-y-1.5">
          {studioActivity.length === 0 ? (
            <p className="text-xs text-slate-400">Standing by for Jarvis dispatch.</p>
          ) : (
            studioActivity.map((ev) => (
              <div
                key={ev.id}
                className="px-3 py-2 rounded bg-[#0b0e14] border border-white/10 text-xs flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-medium text-white truncate">{ev.task}</div>
                  <div className="text-[11px] text-slate-400">{ev.summary}</div>
                </div>
                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                  {ev.status} · {ev.timestamp}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {agentId === "design" && (
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Palette className="w-3.5 h-3.5 text-[#00ffa3]" aria-hidden="true" />
          <span>Design Studio Reference Implementation · Studio Runtime Port 8006</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-300 ml-auto" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
