"use client";

import React, { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Compass,
  FolderGit2,
  Layers,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";
import { AgentDockRosterStrip, getStatusVisual } from "@/components/os/AgentDockV2";

export default function MainBrainHome() {
  const {
    projects,
    activeProject,
    setActiveProjectId,
    knowledgeFeed,
    artifactFeed,
    activityFeed,
    summonAgent,
    summonUtilityWorkspace,
    setMode,
    runTerminalCommand,
  } = useAgentOS();

  const [streamFilter, setStreamFilter] = useState("");
  const [showAllAgentsStrip, setShowAllAgentsStrip] = useState(true);

  const normalizedFilter = streamFilter.trim().toLowerCase();

  const filteredKnowledge = knowledgeFeed.filter(
    (k) =>
      !normalizedFilter ||
      k.title.toLowerCase().includes(normalizedFilter) ||
      k.summary.toLowerCase().includes(normalizedFilter) ||
      k.kind.toLowerCase().includes(normalizedFilter)
  );

  const filteredArtifacts = artifactFeed.filter(
    (a) =>
      !normalizedFilter ||
      a.title.toLowerCase().includes(normalizedFilter) ||
      a.summary.toLowerCase().includes(normalizedFilter) ||
      a.artifactType.toLowerCase().includes(normalizedFilter) ||
      a.studioId.toLowerCase().includes(normalizedFilter)
  );

  const filteredActivity = activityFeed.filter(
    (ev) =>
      !normalizedFilter ||
      ev.agentName.toLowerCase().includes(normalizedFilter) ||
      ev.task.toLowerCase().includes(normalizedFilter) ||
      ev.status.toLowerCase().includes(normalizedFilter)
  );

  return (
    <div
      data-testid="mainbrain-home"
      className="flex-1 min-w-0 h-full overflow-y-auto bg-[#090b0f] text-[#e4e6eb]"
    >
      <div className="max-w-[1440px] mx-auto px-6 py-5 space-y-6">
        {/* ============================================================== */}
        {/* PROJECT CONTEXT LAYER (No corporate KPI cards)                 */}
        {/* ============================================================== */}
        <section
          aria-label="Project Context"
          data-testid="project-context-panel"
          className="pb-5 border-b border-white/10"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <label className="inline-flex items-center gap-2 text-slate-300 font-medium">
                  <FolderGit2 className="w-3.5 h-3.5 text-[#00ffa3]" aria-hidden="true" />
                  <span className="sr-only">Active Project</span>
                  <select
                    value={activeProject.id}
                    onChange={(e) => setActiveProjectId(e.target.value)}
                    aria-label="Select active project context"
                    className="bg-[#11151d] border border-white/15 rounded px-2.5 py-1 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[#00ffa3] capitalize">
                  Phase: {activeProject.phase}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeProject.readinessSummary}</span>
              </div>

              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white leading-snug text-balance">
                MainBrain Workspace — {activeProject.name}
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed">
                {activeProject.objective}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>Constraints: {activeProject.constraints.join(" · ")}</span>
              </div>
            </div>

            {/* Direct Summon Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => summonAgent("design")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#00ffa3] text-black text-xs font-semibold hover:brightness-110 transition-all whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Summon Design Studio</span>
              </button>
              <button
                type="button"
                onClick={() => summonAgent("librarian")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#11151d] border border-white/15 hover:border-white/30 text-xs text-[#e4e6eb] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
              >
                <Plus className="w-3.5 h-3.5 text-[#00ffa3]" aria-hidden="true" />
                <span>Ingest Knowledge</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("brain")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#11151d] border border-white/15 hover:border-white/30 text-xs text-[#e4e6eb] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
              >
                <Compass className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                <span>Open Brain Mode</span>
              </button>
            </div>
          </div>

          {/* Live 9-Agent Presence Roster (Compact Interactive Row) */}
          <div className="mt-5">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-semibold text-slate-300">
                  Live Agent Mesh Roster · click any agent to summon workspace
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAllAgentsStrip(!showAllAgentsStrip)}
                  className="text-[11px] text-slate-400 hover:text-white underline"
                >
                  {showAllAgentsStrip ? "Collapse roster" : "Expand 9 agents"}
                </button>
              </div>

              <label className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" aria-hidden="true" />
                <input
                  type="search"
                  value={streamFilter}
                  onChange={(e) => setStreamFilter(e.target.value)}
                  placeholder="Filter knowledge, artifacts, activity..."
                  aria-label="Filter MainBrain feeds"
                  className="pl-8 pr-3 py-1.5 w-60 md:w-72 rounded bg-[#11151d] border border-white/10 text-xs text-[#e4e6eb] placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
                />
              </label>
            </div>

            {showAllAgentsStrip && <AgentDockRosterStrip />}
          </div>
        </section>

        {/* ============================================================== */}
        {/* MAINBRAIN 3-COLUMN INTELLIGENCE STREAMS                        */}
        {/* Knowledge Feed · Artifact Feed · Agent Activity Feed           */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. KNOWLEDGE FEED */}
          <section
            aria-label="Knowledge Feed"
            data-testid="knowledge-feed"
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" aria-hidden="true" />
                <span>Knowledge Feed</span>
              </h2>
              <button
                type="button"
                onClick={() => summonAgent("librarian")}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-[#00ffa3]"
              >
                <span>Librarian</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10">
              {filteredKnowledge.length === 0 ? (
                <div className="p-4 text-xs text-slate-400">
                  No knowledge entries match &ldquo;{streamFilter}&rdquo;.
                </div>
              ) : (
                filteredKnowledge.map((item) => (
                  <article key={item.id} className="p-3.5 space-y-1.5 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                      <span className="capitalize text-sky-400">{item.kind}</span>
                      <span className="tabular-nums">
                        {item.connectionsCount} links · {item.updatedAt}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#e4e6eb] leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.summary}</p>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{item.author}</span>
                      <button
                        type="button"
                        onClick={() =>
                          runTerminalCommand(
                            `@librarian summarize connections for "${item.title}"`,
                            "librarian"
                          )
                        }
                        className="text-[#00ffa3] hover:underline"
                      >
                        Trace in Terminal
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          {/* 2. ARTIFACT FEED */}
          <section
            aria-label="Artifact Feed"
            data-testid="artifact-feed"
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00ffa3]" aria-hidden="true" />
                <span>Artifact Feed</span>
              </h2>
              <button
                type="button"
                onClick={() =>
                  summonUtilityWorkspace(
                    "audit",
                    "4C Audit Engine",
                    "Artifact & Foundation Health"
                  )
                }
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-[#00ffa3]"
              >
                <span>Audit Integrity</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10">
              {filteredArtifacts.length === 0 ? (
                <div className="p-4 text-xs text-slate-400">
                  No artifacts match &ldquo;{streamFilter}&rdquo;.
                </div>
              ) : (
                filteredArtifacts.map((art) => (
                  <article key={art.id} className="p-3.5 space-y-1.5 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                      <span className="text-teal-300 capitalize">
                        {art.artifactType.replace(/_/g, " ")} · {art.status}
                      </span>
                      <span className="tabular-nums">
                        v{art.version} · #{art.checksumPrefix}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#e4e6eb] leading-snug">
                      {art.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{art.summary}</p>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="capitalize">Studio: {art.studioId} · {art.updatedAt}</span>
                      <button
                        type="button"
                        onClick={() => summonAgent(art.studioId)}
                        className="text-[#00ffa3] hover:underline capitalize"
                      >
                        Summon {art.studioId}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          {/* 3. AGENT ACTIVITY FEED */}
          <section
            aria-label="Agent Activity Feed"
            data-testid="agent-activity-feed"
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-400" aria-hidden="true" />
                <span>Agent Activity Feed</span>
              </h2>
              <button
                type="button"
                onClick={() => summonAgent("jarvis")}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-[#00ffa3]"
              >
                <span>Jarvis Mesh</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10">
              {filteredActivity.slice(0, 8).map((ev) => {
                const vis = getStatusVisual(ev.status);
                return (
                  <article key={ev.id} className="p-3.5 space-y-1.5 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className={`font-semibold ${vis.textClass}`}>
                        {ev.agentName} · {vis.label}
                      </span>
                      <span className="text-slate-400 tabular-nums">{ev.timestamp}</span>
                    </div>
                    <h3 className="text-xs font-semibold text-[#e4e6eb] leading-snug">
                      {ev.task}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{ev.summary}</p>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-mono truncate">{ev.provider}</span>
                      <button
                        type="button"
                        onClick={() => summonAgent(ev.agentId)}
                        className="text-[#00ffa3] hover:underline shrink-0"
                      >
                        Inspect Agent
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
