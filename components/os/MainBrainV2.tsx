"use client";

import React, { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Brain,
  FolderGit2,
  GitBranch,
  Layers,
  Network,
  Play,
  Plus,
  Scale,
  Search,
  ShieldAlert,
  Sparkles,
  Terminal,
  Users,
  Workflow,
  Wrench,
} from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";
import { AgentDockRosterStrip, getStatusVisual } from "@/components/os/AgentDockV2";
import Brain3D from "@/components/Brain3D";
import type { MainBrainViewMode } from "@/lib/agent-os-logic";
import type { BrainNode } from "@/lib/knowledge-data";

interface MainBrainV2Props {
  onGraphNodesLoaded?: (nodes: BrainNode[]) => void;
}

const MAINBRAIN_VIEWS: {
  id: MainBrainViewMode;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "feed",
    label: "Feed View",
    icon: <Activity className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  {
    id: "graph",
    label: "Graph View",
    icon: <Network className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  {
    id: "artifacts",
    label: "Artifacts View",
    icon: <Layers className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  {
    id: "knowledge",
    label: "Knowledge View",
    icon: <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
  {
    id: "decisions",
    label: "Decision View",
    icon: <Scale className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />,
  },
];

export default function MainBrainV2({ onGraphNodesLoaded }: MainBrainV2Props) {
  const {
    projects,
    activeProject,
    activeProjectId,
    setActiveProjectId,
    mainBrainView,
    setMainBrainView,
    knowledgeFeed,
    artifactFeed,
    activityFeed,
    toolActivityFeed,
    decisionFeed,
    workflows,
    librarianRelationships,
    librarianGraphUpdates,
    librarianEvolution,
    councilReport,
    councilConflicts,
    risks,
    latestTerminalCompound,
    summonAgent,
    summonUtilityWorkspace,
    runTerminalCommand,
    executeStudioTool,
    conveneCouncil,
    ingestKnowledgeItem,
    customBrainNodes,
    selectedBrainNode,
    setSelectedBrainNode,
  } = useAgentOS();

  const [streamFilter, setStreamFilter] = useState("");
  const [showAllAgentsStrip, setShowAllAgentsStrip] = useState(false);
  const [brainSearchQuery, setBrainSearchQuery] = useState("");
  const [isExecutingQuickTool, setIsExecutingQuickTool] = useState(false);
  const [isConveningCouncil, setIsConveningCouncil] = useState(false);
  const [quickKnowledgeTitle, setQuickKnowledgeTitle] = useState("");
  const [quickKnowledgeSummary, setQuickKnowledgeSummary] = useState("");

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

  const filteredTools = toolActivityFeed.filter(
    (t) =>
      !normalizedFilter ||
      t.toolName.toLowerCase().includes(normalizedFilter) ||
      t.agentName.toLowerCase().includes(normalizedFilter) ||
      t.result.toLowerCase().includes(normalizedFilter) ||
      t.artifactProduced.toLowerCase().includes(normalizedFilter)
  );

  const filteredDecisions = decisionFeed.filter(
    (d) =>
      !normalizedFilter ||
      d.title.toLowerCase().includes(normalizedFilter) ||
      d.rationale.toLowerCase().includes(normalizedFilter) ||
      d.agentName.toLowerCase().includes(normalizedFilter) ||
      d.workflowType.toLowerCase().includes(normalizedFilter)
  );

  const filteredWorkflows = workflows.filter(
    (wf) =>
      !normalizedFilter ||
      wf.workflowType.toLowerCase().includes(normalizedFilter) ||
      wf.currentStep.toLowerCase().includes(normalizedFilter) ||
      wf.taskQueue.toLowerCase().includes(normalizedFilter)
  );

  const handleQuickToolRun = async () => {
    if (isExecutingQuickTool) return;
    setIsExecutingQuickTool(true);
    try {
      await executeStudioTool("design", "fs.artifact_export", {
        title: `MainBrain Synced Token Spec (${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })})`,
        artifactType: "design_system",
        content: "# MainBrain Consolidated Design Tokens\n\n- Zero-Pill Stream Architecture\n- WCAG 2.1 AA Verified\n",
      });
    } finally {
      setIsExecutingQuickTool(false);
    }
  };

  const handleQuickCouncil = async () => {
    if (isConveningCouncil) return;
    setIsConveningCouncil(true);
    try {
      await conveneCouncil(
        `Evaluate MainBrain consolidation & phase readiness for ${activeProject.name}`
      );
    } finally {
      setIsConveningCouncil(false);
    }
  };

  const handleQuickKnowledgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickKnowledgeTitle.trim() || !quickKnowledgeSummary.trim()) return;
    ingestKnowledgeItem({
      kind: "concept",
      title: quickKnowledgeTitle.trim(),
      summary: quickKnowledgeSummary.trim(),
      projectId: activeProject.id,
      author: "Chief Librarian",
      connectionsCount: 4,
    });
    setQuickKnowledgeTitle("");
    setQuickKnowledgeSummary("");
  };

  return (
    <div
      data-testid="mainbrain-home"
      className="flex-1 min-w-0 h-full overflow-y-auto bg-[#090b0f] text-[#e4e6eb]"
    >
      <div className="max-w-[1440px] mx-auto px-6 py-3.5 space-y-4">
        {/* ============================================================== */}
        {/* MAINBRAIN FIRST RULE & PROJECT CONTEXT HUB                     */}
        {/* ============================================================== */}
        <section
          aria-label="Project Context"
          data-testid="project-context-panel"
          className="pb-3.5 border-b border-white/10 space-y-2.5"
        >
          {/* MainBrain First Orientation Strip */}
          <div
            data-testid="mainbrain-first-orientation"
            className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10 text-xs text-slate-300"
          >
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#00ffa3]">
                <Brain className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>This is my Brain</span>
              </span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span>These are my Agents</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span>These agents are working for me</span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="text-sky-300">Everything is synchronized here</span>
            </div>

            <div className="font-mono text-[11px] text-slate-400 tabular-nums">
              {knowledgeFeed.length} Knowledge · {artifactFeed.length} Artifacts · {decisionFeed.length} Decisions · {toolActivityFeed.length} Tool Runs
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="space-y-1 max-w-4xl">
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
                <label className="inline-flex items-center gap-2 text-slate-300 font-medium">
                  <FolderGit2 className="w-3.5 h-3.5 text-[#00ffa3]" aria-hidden="true" />
                  <span className="sr-only">Active Project</span>
                  <select
                    value={activeProject.id}
                    onChange={(e) => setActiveProjectId(e.target.value)}
                    aria-label="Select active project context"
                    className="bg-[#11151d] border border-white/15 rounded px-2 py-0.5 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
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

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-white leading-snug">
                  MainBrain Intelligence Hub — {activeProject.name}
                </h1>
                <p className="text-xs text-slate-300 leading-snug">
                  {activeProject.objective}
                </p>
              </div>
            </div>

            {/* Direct Teammate & Synchronization Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => summonAgent("design")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00ffa3] text-black text-xs font-semibold hover:brightness-110 transition-all whitespace-nowrap focus-visible:outline-2 focus-visible:outline-white"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Summon Design Studio</span>
              </button>
              <button
                type="button"
                onClick={() => summonAgent("librarian")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#11151d] border border-white/15 hover:border-white/30 text-xs text-[#e4e6eb] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
              >
                <Plus className="w-3.5 h-3.5 text-[#00ffa3]" aria-hidden="true" />
                <span>Summon Librarian</span>
              </button>
              <button
                type="button"
                onClick={() => void handleQuickCouncil()}
                disabled={isConveningCouncil}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#11151d] border border-white/15 hover:border-sky-400/40 text-xs text-[#e4e6eb] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#00ffa3] disabled:opacity-60"
              >
                <Users className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                <span>{isConveningCouncil ? "Convening..." : "Convene Council"}</span>
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* INTEGRATED MAINBRAIN VIEW LENSES                               */}
          {/* Feed View · Graph View · Artifacts View · Knowledge · Decision */}
          {/* ============================================================== */}
          <div className="pt-1 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
            <div
              role="tablist"
              aria-label="MainBrain Intelligence Views"
              data-testid="mainbrain-view-switcher"
              className="flex items-center gap-1 p-1 rounded-md bg-[#11141a] border border-white/10 overflow-x-auto"
            >
              {MAINBRAIN_VIEWS.map((view) => {
                const active = mainBrainView === view.id;
                return (
                  <button
                    key={view.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    data-testid={`mainbrain-view-${view.id}`}
                    onClick={() => setMainBrainView(view.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00ffa3] ${
                      active
                        ? "bg-[#00ffa3] text-black font-semibold"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {view.icon}
                    <span>{view.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAllAgentsStrip(!showAllAgentsStrip)}
                className="text-xs text-slate-400 hover:text-white underline whitespace-nowrap"
              >
                {showAllAgentsStrip ? "Collapse Teammate Roster" : "Show 9 Teammates"}
              </button>

              <label className="relative flex items-center">
                <Search
                  className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={streamFilter}
                  onChange={(e) => setStreamFilter(e.target.value)}
                  placeholder="Filter knowledge, artifacts, decisions, tools..."
                  aria-label="Filter MainBrain feeds"
                  className="pl-8 pr-3 py-1.5 w-60 md:w-72 rounded bg-[#11151d] border border-white/10 text-xs text-[#e4e6eb] placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
                />
              </label>
            </div>
          </div>

          {/* Live 9-Agent Teammate Roster */}
          {showAllAgentsStrip && (
            <div className="pt-1">
              <AgentDockRosterStrip />
            </div>
          )}

          {/* Terminal + Brain Synchronization Live Compound Banner */}
          {latestTerminalCompound && (
            <div
              data-testid="mainbrain-terminal-sync-banner"
              className="p-3 rounded-md bg-[#11151d] border border-[#00ffa3]/40 space-y-1.5 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#00ffa3] flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    Terminal + MainBrain Synchronized · $ {latestTerminalCompound.command}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  {latestTerminalCompound.agentName} · {latestTerminalCompound.toolName} ({latestTerminalCompound.durationMs}ms) · {latestTerminalCompound.timestamp}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-1 text-[11px] font-mono">
                <div className="truncate">
                  <span className="text-slate-400">Execution: </span>
                  <span className="text-white">{latestTerminalCompound.executionRecordId}</span>
                </div>
                <div className="truncate">
                  <span className="text-slate-400">Artifact: </span>
                  <span className="text-teal-300">{latestTerminalCompound.artifactTitle}</span>
                </div>
                <div className="truncate">
                  <span className="text-slate-400">Knowledge: </span>
                  <span className="text-sky-300">{latestTerminalCompound.knowledgeCandidateTitle}</span>
                </div>
                <div className="truncate">
                  <span className="text-slate-400">Decision: </span>
                  <span className="text-violet-300">{latestTerminalCompound.decisionTitle}</span>
                </div>
                <div className="truncate">
                  <span className="text-slate-400">Audit: </span>
                  <span className="text-amber-300">{latestTerminalCompound.auditEntryId}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ============================================================== */}
        {/* VIEW 1: FEED VIEW (Unified Intelligence Hub)                   */}
        {/* ============================================================== */}
        {mainBrainView === "feed" && (
          <div className="space-y-6">
            {/* Primary 3-Column Stream: Knowledge & Librarian · Artifacts & Workflows · Tools, Decisions & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* COLUMN 1: KNOWLEDGE FEED + LIBRARIAN SYNCHRONIZATION */}
              <div className="space-y-6">
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
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setMainBrainView("knowledge")}
                        className="text-xs text-sky-300 hover:underline"
                      >
                        Knowledge View
                      </button>
                      <button
                        type="button"
                        onClick={() => summonAgent("librarian")}
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-[#00ffa3]"
                      >
                        <span>Librarian</span>
                        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10">
                    {filteredKnowledge.length === 0 ? (
                      <div className="p-4 text-xs text-slate-400">
                        No knowledge entries match &ldquo;{streamFilter}&rdquo;.
                      </div>
                    ) : (
                      filteredKnowledge.slice(0, 5).map((item) => (
                        <article
                          key={item.id}
                          className="p-3.5 space-y-1.5 hover:bg-white/[0.02] transition-colors"
                        >
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
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setMainBrainView("graph")}
                                className="text-sky-300 hover:underline"
                              >
                                Graph View
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void runTerminalCommand(
                                    `@librarian summarize connections for "${item.title}"`,
                                    "librarian"
                                  )
                                }
                                className="text-[#00ffa3] hover:underline"
                              >
                                Trace in Terminal
                              </button>
                            </div>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </section>

                {/* LIBRARIAN INTELLIGENCE SYNCHRONIZATION */}
                <section
                  aria-label="Librarian Intelligence Synchronization"
                  data-testid="librarian-sync-panel"
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-[#00ffa3]" aria-hidden="true" />
                      <span>Librarian Sync · Relationships & Evolution</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setMainBrainView("knowledge")}
                      className="text-xs text-slate-400 hover:text-[#00ffa3]"
                    >
                      Inspect All
                    </button>
                  </div>

                  <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10 text-xs">
                    <div className="p-3 space-y-1.5">
                      <div className="font-mono text-[11px] text-slate-400">
                        New Semantic Relationships ({librarianRelationships.length})
                      </div>
                      {librarianRelationships.slice(0, 3).map((rel) => (
                        <div key={rel.id} className="text-[11px] text-slate-300 leading-snug">
                          <span className="text-white font-medium">{rel.sourceTitle}</span>{" "}
                          <span className="font-mono text-[#00ffa3]">{rel.relationType}</span>{" "}
                          <span className="text-sky-300">{rel.targetTitle}</span>{" "}
                          <span className="font-mono text-slate-400 tabular-nums">
                            ({Math.round(rel.confidence * 100)}%)
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 space-y-1.5">
                      <div className="font-mono text-[11px] text-slate-400">
                        Recent Graph Updates ({librarianGraphUpdates.length})
                      </div>
                      {librarianGraphUpdates.slice(0, 2).map((up) => (
                        <div key={up.id} className="text-[11px] text-slate-300 leading-snug">
                          <span className="font-mono text-teal-300">{up.action}</span> · {up.summary}
                        </div>
                      ))}
                    </div>

                    <div className="p-3 space-y-1.5">
                      <div className="font-mono text-[11px] text-slate-400">
                        Knowledge Evolution ({librarianEvolution.length})
                      </div>
                      {librarianEvolution.slice(0, 2).map((evo) => (
                        <div key={evo.id} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-white truncate">{evo.conceptTitle}</span>
                          <span className="font-mono text-sky-300 shrink-0 tabular-nums">
                            {evo.stage} · {evo.version} ({evo.connectionsCount} links)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              {/* COLUMN 2: ARTIFACT FEED + WORKFLOW FEED + AGENT COUNCIL */}
              <div className="space-y-6">
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
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setMainBrainView("artifacts")}
                        className="text-xs text-teal-300 hover:underline"
                      >
                        Artifacts View
                      </button>
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
                        <span>Audit</span>
                        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10">
                    {filteredArtifacts.length === 0 ? (
                      <div className="p-4 text-xs text-slate-400">
                        No artifacts match &ldquo;{streamFilter}&rdquo;.
                      </div>
                    ) : (
                      filteredArtifacts.slice(0, 4).map((art) => (
                        <article
                          key={art.id}
                          className="p-3.5 space-y-1.5 hover:bg-white/[0.02] transition-colors"
                        >
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
                            <span className="capitalize">
                              Studio: {art.studioId} · {art.updatedAt}
                            </span>
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

                {/* WORKFLOW FEED */}
                <section
                  aria-label="Workflow Feed"
                  data-testid="workflow-feed"
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Workflow className="w-4 h-4 text-violet-400" aria-hidden="true" />
                      <span>Workflow Feed</span>
                    </h2>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      {filteredWorkflows.length} Temporal workflows
                    </span>
                  </div>

                  <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10">
                    {filteredWorkflows.slice(0, 4).map((wf) => (
                      <article
                        key={wf.id}
                        className="p-3.5 space-y-1 hover:bg-white/[0.02] transition-colors text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                          <span className="text-sky-300 font-semibold truncate">
                            {wf.workflowType}
                          </span>
                          <span className="text-[#00ffa3] uppercase shrink-0">
                            {wf.status}
                          </span>
                        </div>
                        <div className="text-[#e4e6eb] font-medium">{wf.currentStep}</div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>Queue: {wf.taskQueue}</span>
                          <span className="tabular-nums">{wf.startedAt}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                {/* EMBEDDED AGENT COUNCIL VISUALIZATION */}
                <section
                  aria-label="Agent Council Visualization"
                  data-testid="agent-council-panel"
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-sky-400" aria-hidden="true" />
                      <span>Agent Council · Consensus & Conflicts</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setMainBrainView("decisions")}
                      className="text-xs text-sky-300 hover:underline"
                    >
                      Decision View
                    </button>
                  </div>

                  {councilReport && (
                    <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10 text-xs">
                      <div className="p-3.5 space-y-1.5">
                        <div className="font-mono text-[11px] text-[#00ffa3]">
                          Consensus Ratified
                        </div>
                        <p className="text-slate-200 leading-relaxed">
                          {councilReport.consensusSummary}
                        </p>
                      </div>

                      <div className="p-3.5 space-y-1.5">
                        <div className="font-mono text-[11px] text-slate-400">
                          Studio Recommendations ({councilReport.opinions.length})
                        </div>
                        {councilReport.opinions.slice(0, 3).map((op) => (
                          <div
                            key={op.studioId}
                            className="flex items-start justify-between gap-2 text-[11px]"
                          >
                            <span className="text-slate-300">
                              <strong className="text-sky-300 uppercase font-mono">
                                {op.studioId}:
                              </strong>{" "}
                              {op.recommendation}
                            </span>
                            <span className="font-mono text-teal-300 shrink-0 tabular-nums">
                              {Math.round(op.confidence * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="p-3.5 space-y-1.5">
                        <div className="font-mono text-[11px] text-amber-300">
                          Resolved Cross-Studio Conflicts ({councilConflicts.length})
                        </div>
                        {councilConflicts.slice(0, 2).map((conf) => (
                          <div key={conf.id} className="space-y-0.5 text-[11px]">
                            <div className="font-medium text-white">{conf.topic}</div>
                            <div className="text-slate-400">
                              Resolution: {conf.resolution}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-3.5 space-y-1">
                        <div className="font-mono text-[11px] text-rose-300">
                          Monitored Risks ({councilReport.risks.length + risks.length})
                        </div>
                        {councilReport.risks.slice(0, 2).map((riskText, idx) => (
                          <div key={idx} className="text-[11px] text-slate-300">
                            · {riskText}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {/* COLUMN 3: DECISION FEED + TOOL ACTIVITY FEED + AGENT ACTIVITY FEED */}
              <div className="space-y-6">
                {/* DECISION FEED */}
                <section
                  aria-label="Decision Feed"
                  data-testid="decision-feed"
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Scale className="w-4 h-4 text-violet-400" aria-hidden="true" />
                      <span>Decision Feed</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => setMainBrainView("decisions")}
                      className="text-xs text-violet-300 hover:underline"
                    >
                      All Decisions ({filteredDecisions.length})
                    </button>
                  </div>

                  <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10">
                    {filteredDecisions.slice(0, 4).map((dec) => (
                      <article
                        key={dec.id}
                        className="p-3.5 space-y-1.5 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                          <span className="text-violet-300 uppercase">
                            {dec.impact} · {dec.status}
                          </span>
                          <span className="text-slate-400 tabular-nums">
                            {dec.agentName} · {dec.timestamp}
                          </span>
                        </div>
                        <h3 className="text-xs font-semibold text-white leading-snug">
                          {dec.title}
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {dec.rationale}
                        </p>
                        <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span className="text-sky-300 truncate">{dec.workflowType}</span>
                          <button
                            type="button"
                            onClick={() => summonAgent(dec.agentId)}
                            className="text-[#00ffa3] hover:underline shrink-0"
                          >
                            Summon {dec.agentName}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                {/* TOOL ACTIVITY FEED */}
                <section
                  aria-label="Tool Activity Feed"
                  data-testid="tool-activity-feed"
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-[#00ffa3]" aria-hidden="true" />
                      <span>Tool Activity Feed</span>
                    </h2>
                    <button
                      type="button"
                      data-testid="quick-execute-tool-btn"
                      disabled={isExecutingQuickTool}
                      onClick={() => void handleQuickToolRun()}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#00ffa3]/15 border border-[#00ffa3]/40 text-[11px] font-mono text-[#00ffa3] hover:bg-[#00ffa3]/25 disabled:opacity-60"
                    >
                      <Play className="w-3 h-3" aria-hidden="true" />
                      <span>
                        {isExecutingQuickTool ? "Running..." : "Run fs.artifact_export"}
                      </span>
                    </button>
                  </div>

                  <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10">
                    {filteredTools.slice(0, 5).map((toolItem) => (
                      <article
                        key={toolItem.id}
                        data-testid={`tool-activity-item-${toolItem.toolName}`}
                        className="p-3.5 space-y-1.5 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                          <span className="font-semibold text-[#00ffa3]">
                            {toolItem.toolName}
                          </span>
                          <span className="text-slate-300 tabular-nums">
                            {toolItem.executionTimeMs}ms · {toolItem.timestamp}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300">
                          <span className="font-medium">Agent: {toolItem.agentName}</span>
                          <span className="font-mono text-[10px] uppercase text-teal-300">
                            {toolItem.category} · {toolItem.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          Result: {toolItem.result}
                        </p>

                        <div className="pt-1 flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                          <span className="text-sky-300 truncate">
                            Artifact: {toolItem.artifactProduced}
                          </span>
                          <button
                            type="button"
                            onClick={() => summonAgent(toolItem.agentId)}
                            className="text-[#00ffa3] hover:underline shrink-0"
                          >
                            Inspect Studio
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                {/* AGENT ACTIVITY FEED */}
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
                    {filteredActivity.slice(0, 5).map((ev) => {
                      const vis = getStatusVisual(ev.status);
                      return (
                        <article
                          key={ev.id}
                          className="p-3.5 space-y-1.5 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                            <span className={`font-semibold ${vis.textClass}`}>
                              {ev.agentName} · {ev.runtimeState || vis.label}
                            </span>
                            <span className="text-slate-400 tabular-nums">{ev.timestamp}</span>
                          </div>
                          <h3 className="text-xs font-semibold text-[#e4e6eb] leading-snug">
                            {ev.task}
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed">{ev.summary}</p>
                          {(ev.workflowType || ev.artifactTitle) && (
                            <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                              <span className="text-sky-300 truncate">
                                {ev.workflowType || "EventBus"}
                              </span>
                              {ev.artifactTitle && (
                                <span className="text-teal-300 truncate text-right">
                                  {ev.artifactTitle}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-mono truncate">{ev.provider}</span>
                            <button
                              type="button"
                              onClick={() => summonAgent(ev.agentId)}
                              className="text-[#00ffa3] hover:underline shrink-0"
                            >
                              Summon Teammate
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
        )}

        {/* ============================================================== */}
        {/* VIEW 2: GRAPH VIEW (Integrated 3D Brain Graph inside MainBrain) */}
        {/* ============================================================== */}
        {mainBrainView === "graph" && (
          <section
            aria-label="Integrated MainBrain 3D Graph View"
            data-testid="mainbrain-graph-view"
            className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
          >
            <div className="lg:col-span-8 h-[620px] rounded-md overflow-hidden border border-white/15 bg-[#07090d] relative">
              <Brain3D
                onSelectNode={(node) => setSelectedBrainNode(node)}
                selectedNodeId={selectedBrainNode?.id}
                searchQuery={brainSearchQuery}
                onSearchChange={setBrainSearchQuery}
                customNodes={customBrainNodes}
                projectId={activeProjectId}
                onGraphNodesLoaded={onGraphNodesLoaded}
              />
            </div>

            <aside className="lg:col-span-4 flex flex-col justify-between space-y-4">
              <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10 text-xs">
                <div className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      MainBrain Graph Synchronization
                    </span>
                    <span className="font-mono text-[11px] text-[#00ffa3]">
                      Live Topology
                    </span>
                  </div>
                  <p className="text-slate-400">
                    Every artifact, knowledge candidate, and council decision is indexed as a connected node inside MainBrain.
                  </p>
                </div>

                <div className="p-3.5 space-y-2">
                  <div className="font-mono text-[11px] text-sky-300">
                    New Relationships ({librarianRelationships.length})
                  </div>
                  {librarianRelationships.slice(0, 4).map((rel) => (
                    <div key={rel.id} className="space-y-0.5 text-[11px]">
                      <div className="text-white font-medium truncate">
                        {rel.sourceTitle} &rarr; {rel.targetTitle}
                      </div>
                      <div className="font-mono text-slate-400">
                        {rel.relationType} · {Math.round(rel.confidence * 100)}% confidence · {rel.timestamp}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 space-y-2">
                  <div className="font-mono text-[11px] text-teal-300">
                    Recent Graph Mutations ({librarianGraphUpdates.length})
                  </div>
                  {librarianGraphUpdates.slice(0, 3).map((up) => (
                    <div key={up.id} className="space-y-0.5 text-[11px]">
                      <div className="font-mono text-white">
                        {up.action} (#{up.checksumPrefix})
                      </div>
                      <div className="text-slate-300">{up.summary}</div>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => summonAgent("librarian")}
                    className="text-xs text-[#00ffa3] hover:underline font-medium"
                  >
                    Summon Librarian Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => setMainBrainView("feed")}
                    className="text-xs text-slate-300 hover:text-white underline"
                  >
                    Return to Unified Feed
                  </button>
                </div>
              </div>
            </aside>
          </section>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: ARTIFACTS VIEW (Integrated Artifact Stream)            */}
        {/* ============================================================== */}
        {mainBrainView === "artifacts" && (
          <section
            aria-label="Integrated MainBrain Artifact Stream"
            data-testid="mainbrain-artifacts-view"
            className="space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Integrated Artifact Stream ({filteredArtifacts.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Cryptographically checksummed deliverables emitted across all Studios and Terminal executions.
                </p>
              </div>
              <button
                type="button"
                disabled={isExecutingQuickTool}
                onClick={() => void handleQuickToolRun()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#00ffa3] text-black text-xs font-semibold hover:brightness-110 disabled:opacity-60"
              >
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Export New Design Artifact</span>
              </button>
            </div>

            <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10">
              {filteredArtifacts.map((art) => (
                <article
                  key={art.id}
                  className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-white/[0.02]"
                >
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
                      <span className="text-teal-300 uppercase">{art.artifactType}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#00ffa3]">{art.status}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">v{art.version}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">sha256 #{art.checksumPrefix}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">{art.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{art.summary}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    <span className="font-mono text-slate-400 capitalize">
                      Studio: {art.studioId} · {art.updatedAt}
                    </span>
                    <button
                      type="button"
                      onClick={() => summonAgent(art.studioId)}
                      className="px-3 py-1.5 rounded bg-white/5 border border-white/15 hover:border-[#00ffa3] text-[#00ffa3] font-medium capitalize"
                    >
                      Open {art.studioId}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* VIEW 4: KNOWLEDGE VIEW (Integrated Knowledge & Librarian Sync) */}
        {/* ============================================================== */}
        {mainBrainView === "knowledge" && (
          <section
            aria-label="Integrated MainBrain Knowledge View"
            data-testid="mainbrain-knowledge-view"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">
                  Recently Indexed Knowledge ({filteredKnowledge.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setMainBrainView("graph")}
                  className="text-xs text-sky-300 hover:underline"
                >
                  Open 3D Graph View
                </button>
              </div>

              <form
                onSubmit={handleQuickKnowledgeSubmit}
                className="p-3.5 rounded-md bg-[#11141a] border border-white/10 grid grid-cols-1 sm:grid-cols-12 gap-2"
              >
                <input
                  type="text"
                  value={quickKnowledgeTitle}
                  onChange={(e) => setQuickKnowledgeTitle(e.target.value)}
                  placeholder="Index new concept or architectural pattern..."
                  aria-label="New knowledge title"
                  className="sm:col-span-4 px-3 py-1.5 rounded bg-[#090b0f] border border-white/15 text-xs text-white"
                />
                <input
                  type="text"
                  value={quickKnowledgeSummary}
                  onChange={(e) => setQuickKnowledgeSummary(e.target.value)}
                  placeholder="Summary & provenance link..."
                  aria-label="New knowledge summary"
                  className="sm:col-span-6 px-3 py-1.5 rounded bg-[#090b0f] border border-white/15 text-xs text-white"
                />
                <button
                  type="submit"
                  className="sm:col-span-2 px-3 py-1.5 rounded bg-[#00ffa3] text-black text-xs font-semibold hover:brightness-110"
                >
                  Index
                </button>
              </form>

              <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10">
                {filteredKnowledge.map((k) => (
                  <article key={k.id} className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span className="text-sky-400 uppercase">{k.kind}</span>
                      <span className="tabular-nums">
                        {k.connectionsCount} semantic links · {k.updatedAt}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">{k.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{k.summary}</p>
                    <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Indexed by {k.author}</span>
                      <button
                        type="button"
                        onClick={() =>
                          void runTerminalCommand(
                            `@librarian trace provenance for "${k.title}"`,
                            "librarian"
                          )
                        }
                        className="text-[#00ffa3] hover:underline"
                      >
                        Trace via Terminal
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-5">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white">
                  New Relationships ({librarianRelationships.length})
                </h3>
                <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10 text-xs">
                  {librarianRelationships.map((rel) => (
                    <div key={rel.id} className="p-3 space-y-1">
                      <div className="text-white font-medium">
                        {rel.sourceTitle}{" "}
                        <span className="font-mono text-[#00ffa3]">{rel.relationType}</span>{" "}
                        {rel.targetTitle}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                        Confidence: {Math.round(rel.confidence * 100)}% · {rel.discoveredBy} · {rel.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white">
                  Graph Updates ({librarianGraphUpdates.length})
                </h3>
                <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10 text-xs">
                  {librarianGraphUpdates.map((up) => (
                    <div key={up.id} className="p-3 space-y-1">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-teal-300">{up.action}</span>
                        <span className="text-slate-400 tabular-nums">
                          +{up.affectedNodes} nodes · +{up.affectedEdges} edges · #{up.checksumPrefix}
                        </span>
                      </div>
                      <p className="text-slate-300">{up.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white">
                  Knowledge Evolution ({librarianEvolution.length})
                </h3>
                <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10 text-xs">
                  {librarianEvolution.map((evo) => (
                    <div key={evo.id} className="p-3 space-y-1">
                      <div className="flex items-center justify-between font-mono text-[11px]">
                        <span className="text-sky-300 font-semibold">{evo.conceptTitle}</span>
                        <span className="text-[#00ffa3]">
                          {evo.stage} · {evo.version}
                        </span>
                      </div>
                      <p className="text-slate-300">{evo.deltaSummary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* VIEW 5: DECISION VIEW (Integrated Decisions & Agent Council)   */}
        {/* ============================================================== */}
        {mainBrainView === "decisions" && (
          <section
            aria-label="Integrated MainBrain Decision View"
            data-testid="mainbrain-decisions-view"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Left 7 Cols: Ratified Decision Stream */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Integrated Decision Stream ({filteredDecisions.length})
                  </h2>
                  <p className="text-xs text-slate-400">
                    Every architectural, governance, design, and terminal decision ratified inside MainBrain.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleQuickCouncil()}
                  disabled={isConveningCouncil}
                  className="px-3 py-1.5 rounded bg-sky-400 text-black text-xs font-semibold hover:brightness-110 disabled:opacity-60"
                >
                  {isConveningCouncil ? "Convening..." : "Convene Council Vote"}
                </button>
              </div>

              <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10">
                {filteredDecisions.map((dec) => (
                  <article key={dec.id} className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="text-violet-300 uppercase">
                        {dec.impact} · {dec.status}
                      </span>
                      <span className="text-slate-400 tabular-nums">
                        {dec.agentName} · {dec.workflowType} · {dec.timestamp}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">{dec.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{dec.rationale}</p>
                    <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>
                        Artifact: {dec.relatedArtifact ?? "N/A"} · Audit: {dec.auditEntryId ?? "verified"}
                      </span>
                      <button
                        type="button"
                        onClick={() => summonAgent(dec.agentId)}
                        className="text-[#00ffa3] hover:underline"
                      >
                        Summon {dec.agentName}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Right 5 Cols: Agent Council Consensus, Recommendations, Conflicts & Risks */}
            <div className="lg:col-span-5 space-y-5">
              {councilReport && (
                <div className="divide-y divide-white/10 rounded-md bg-[#11141a] border border-white/10 text-xs">
                  <div className="p-4 space-y-1.5">
                    <div className="font-mono text-[11px] text-[#00ffa3]">
                      Agent Council Consensus
                    </div>
                    <p className="text-white font-medium leading-relaxed">
                      {councilReport.consensusSummary}
                    </p>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="font-mono text-[11px] text-sky-300">
                      Council Recommendations ({councilReport.opinions.length})
                    </div>
                    {councilReport.opinions.map((op) => (
                      <div key={op.studioId} className="space-y-1 pt-1">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-white uppercase font-semibold">
                            {op.studioId} Studio
                          </span>
                          <span className="text-teal-300 tabular-nums">
                            Confidence {Math.round(op.confidence * 100)}%
                          </span>
                        </div>
                        <p className="text-slate-300">{op.recommendation}</p>
                        <p className="text-[11px] text-amber-300/90">Risk Note: {op.risk}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="font-mono text-[11px] text-amber-300">
                      Council Conflicts & Resolutions ({councilConflicts.length})
                    </div>
                    {councilConflicts.map((conf) => (
                      <div key={conf.id} className="space-y-1 pt-1">
                        <div className="font-semibold text-white">{conf.topic}</div>
                        <div className="text-[11px] text-slate-400">
                          Studios: {conf.studiosInvolved.join(", ")} · Status: {conf.status}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          Tension: {conf.tension}
                        </div>
                        <div className="text-[11px] text-teal-300">
                          Resolution: {conf.resolution}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 space-y-1.5">
                    <div className="font-mono text-[11px] text-rose-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Active Risks & Mitigations</span>
                    </div>
                    {councilReport.risks.map((r, i) => (
                      <div key={i} className="text-slate-300">
                        · {r}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
