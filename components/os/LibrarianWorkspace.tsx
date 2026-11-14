"use client";

import React, { useState } from "react";
import { BookOpen, FolderTree, Network, Plus, RefreshCw } from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";
import VaultExplorer from "@/components/VaultExplorer";

export default function LibrarianWorkspace() {
  const {
    activeProject,
    knowledgeFeed,
    ingestKnowledgeItem,
    publishNodeToBrain,
    setMode,
    runTerminalCommand,
  } = useAgentOS();

  const [activeTab, setActiveTab] = useState<"console" | "vault">("console");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"concept" | "decision" | "pattern" | "wiki">("concept");
  const [summary, setSummary] = useState("");

  const handleQuickIngest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) return;
    ingestKnowledgeItem({
      kind,
      title: title.trim(),
      summary: summary.trim(),
      projectId: activeProject.id,
      author: "Chief Librarian",
      connectionsCount: 3,
    });
    publishNodeToBrain({
      id: `node-lib-${Date.now()}`,
      title: title.trim(),
      category: "Wiki Page",
      kind: kind === "concept" ? "concept" : "note",
      area: "system",
      summary: summary.trim(),
      notes: `# ${title.trim()}\n\n${summary.trim()}`,
      stalenessDays: 0,
      needsAttention: false,
      connections: ["node-chief-librarian", "node-cortex-engine"],
      tags: ["librarian-ingested", kind],
      x: 24,
      y: 18,
      z: -16,
      radius: 6,
      isKeyAnchor: true,
    });
    setTitle("");
    setSummary("");
  };

  return (
    <div className="space-y-5">
      {/* Sub-view Switcher: Librarian Console vs Embedded Vault */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-1 p-1 rounded bg-[#0b0e14] border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("console")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${
              activeTab === "console"
                ? "bg-[#00ffa3] text-black font-semibold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Librarian Console</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("vault")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium ${
              activeTab === "vault"
                ? "bg-[#00ffa3] text-black font-semibold"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" aria-hidden="true" />
            <span>4C Knowledge Vault</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMode("brain")}
          className="inline-flex items-center gap-1.5 text-xs text-[#00ffa3] hover:underline"
        >
          <Network className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Inspect in Brain Mode</span>
        </button>
      </div>

      {activeTab === "console" ? (
        <div className="space-y-5">
          {/* Quick Ingest into MainBrain */}
          <form onSubmit={handleQuickIngest} className="space-y-3 p-3.5 rounded-md bg-[#0b0e14] border border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Ingest & Index Knowledge Object
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Project: {activeProject.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Concept, decision, or pattern title..."
                aria-label="Knowledge title"
                className="sm:col-span-2 px-3 py-2 rounded bg-[#11151d] border border-white/15 text-xs text-[#e4e6eb]"
              />
              <select
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as "concept" | "decision" | "pattern" | "wiki")
                }
                aria-label="Knowledge object kind"
                className="px-2.5 py-2 rounded bg-[#11151d] border border-white/15 text-xs text-[#e4e6eb]"
              >
                <option value="concept">Concept</option>
                <option value="decision">Decision</option>
                <option value="pattern">Pattern</option>
                <option value="wiki">Wiki Page</option>
              </select>
            </div>

            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Concise knowledge synthesis for MainBrain..."
              aria-label="Knowledge summary"
              className="w-full px-3 py-2 rounded bg-[#11151d] border border-white/15 text-xs text-[#e4e6eb]"
            />

            <div className="flex items-center justify-between gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#00ffa3] text-black text-xs font-semibold hover:brightness-110"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Ingest to MainBrain</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  runTerminalCommand(
                    `@librarian audit knowledge graph contradictions for ${activeProject.id}`,
                    "librarian"
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 border border-white/10 text-xs text-slate-300 hover:text-white"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Run Graph Contradiction Audit</span>
              </button>
            </div>
          </form>

          {/* Knowledge Stream Preview */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Curated Knowledge Index ({knowledgeFeed.length})
            </h3>
            <div className="divide-y divide-white/10 border border-white/10 rounded-md bg-[#0b0e14]">
              {knowledgeFeed.map((item) => (
                <div key={item.id} className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white">{item.title}</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {item.kind} · {item.connectionsCount} links
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-white/10 overflow-hidden bg-[#0b0e14]">
          <VaultExplorer
            onIngestToGraph={(vaultTitle, vaultSummary) => {
              ingestKnowledgeItem({
                kind: "wiki",
                title: vaultTitle,
                summary: vaultSummary,
                projectId: activeProject.id,
                author: "Chief Librarian",
                connectionsCount: 4,
              });
              publishNodeToBrain({
                id: `node-vault-${Date.now()}`,
                title: vaultTitle,
                category: "Wiki Page",
                kind: "note",
                area: "system",
                summary: vaultSummary,
                notes: `# ${vaultTitle}\n\n${vaultSummary}`,
                stalenessDays: 0,
                needsAttention: false,
                connections: ["node-chief-librarian", "node-cortex-engine"],
                tags: ["vault-ingested"],
                x: 32,
                y: 22,
                z: -20,
                radius: 6,
                isKeyAnchor: true,
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
