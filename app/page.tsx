"use client";

import React, { useState } from "react";
import AgentDockV2 from "@/components/os/AgentDockV2";
import ModeSwitcher from "@/components/os/ModeSwitcher";
import AgentActivityLayer from "@/components/os/AgentActivityLayer";
import MainBrainHome from "@/components/os/MainBrainHome";
import WorkspaceHost from "@/components/os/WorkspaceHost";
import TerminalSandboxHome from "@/components/os/TerminalSandboxHome";
import Brain3D from "@/components/Brain3D";
import WarRoom from "@/components/WarRoom";
import NodeInspector from "@/components/NodeInspector";
import ArchitectureModal from "@/components/ArchitectureModal";
import { AgentOSProvider, useAgentOS } from "@/lib/agent-os-store";
import { KEY_NODES, type BrainNode } from "@/lib/knowledge-data";

function CortexOSShell() {
  const {
    mode,
    setMode,
    activeProjectId,
    setActiveProjectId,
    customBrainNodes,
    publishNodeToBrain,
    selectedBrainNode,
    setSelectedBrainNode,
    isBlueprintOpen,
    setIsBlueprintOpen,
    runTerminalCommand,
  } = useAgentOS();

  const [brainSearchQuery, setBrainSearchQuery] = useState("");
  const [loadedBrainNodes, setLoadedBrainNodes] = useState<BrainNode[]>([]);

  const handleSelectConnectedNode = async (nodeId: string) => {
    const found =
      loadedBrainNodes.find((n) => n.id === nodeId) ||
      customBrainNodes.find((n) => n.id === nodeId) ||
      KEY_NODES.find((n) => n.id === nodeId);
    if (found) {
      setSelectedBrainNode(found);
      return;
    }
    try {
      const res = await fetch(`/api/graph/${encodeURIComponent(nodeId)}?depth=2`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.nodes)) {
          setLoadedBrainNodes(data.nodes);
          const matched = data.nodes.find((n: BrainNode) => n.id === nodeId);
          if (matched) {
            setSelectedBrainNode(matched);
            return;
          }
        }
      }
    } catch {
      // Offline fallback node below
    }
    setSelectedBrainNode({
      id: nodeId,
      title: nodeId,
      category: "Wiki Page",
      summary: "Connected node in CortexOS brain graph.",
      notes: `# Connected Node: ${nodeId}`,
      stalenessDays: 0,
      needsAttention: false,
      connections: [],
      tags: ["graph-node"],
      x: 0,
      y: 0,
      z: 0,
      radius: 5,
    });
  };

  const handleAskAiAboutNode = (node: BrainNode) => {
    setSelectedBrainNode(null);
    void runTerminalCommand(
      `@librarian analyze "${node.title}" (${node.category}) and its links to active studios`
    );
  };

  return (
    <main className="flex flex-col w-full h-screen bg-[#090b0f] text-[#e4e6eb] overflow-hidden">
      {/* ==================================================================== */}
      {/* AI OPERATING SYSTEM TOP BAR: Wordmark — AgentDockV2 — ModeSwitcher    */}
      {/* ==================================================================== */}
      <header className="h-14 shrink-0 px-4 md:px-6 bg-[#0b0e14] border-b border-white/15 flex items-center justify-between gap-4 z-40">
        <a
          href="#mainbrain"
          onClick={(e) => {
            e.preventDefault();
            setMode("mainbrain");
          }}
          className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight text-[#e4e6eb] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#00ffa3]"
        >
          Cortex<span className="text-[#00ffa3]">OS</span>
        </a>

        <AgentDockV2 />

        <ModeSwitcher />
      </header>

      {/* ==================================================================== */}
      {/* REAL-TIME AGENT PRESENCE LAYER                                       */}
      {/* ==================================================================== */}
      <AgentActivityLayer />

      {/* ==================================================================== */}
      {/* CENTRAL OS VIEWPORT (MainBrain / Brain Mode / War Room + Workspaces) */}
      {/* ==================================================================== */}
      <div className="relative flex-1 min-h-0 flex overflow-hidden">
        {mode === "mainbrain" && <MainBrainHome />}

        {mode === "brain" && (
          <div className="flex-1 min-w-0 h-full relative">
            <Brain3D
              onSelectNode={(node) => setSelectedBrainNode(node)}
              selectedNodeId={selectedBrainNode?.id}
              searchQuery={brainSearchQuery}
              onSearchChange={setBrainSearchQuery}
              customNodes={customBrainNodes}
              projectId={activeProjectId}
              onGraphNodesLoaded={setLoadedBrainNodes}
            />
          </div>
        )}

        {mode === "warroom" && (
          <div className="flex-1 min-w-0 h-full relative">
            <WarRoom
              onPublishNodeToBrain={publishNodeToBrain}
              onSwitchToBrainMode={() => setMode("brain")}
              activeProjectId={activeProjectId}
              onActiveProjectIdChange={setActiveProjectId}
            />
          </div>
        )}

        {/* Summonable Workspace Layer (Slide-in Drawer / Pinned Rail / Focus / Dock) */}
        <WorkspaceHost />

        {/* Slide-over 3D Node Inspector */}
        <NodeInspector
          node={selectedBrainNode}
          onClose={() => setSelectedBrainNode(null)}
          onSelectConnectedNode={handleSelectConnectedNode}
          onAskAiAboutNode={handleAskAiAboutNode}
        />

        {/* Architecture & Blueprint Spec Modal (Summoned from Jarvis Workspace) */}
        <ArchitectureModal
          isOpen={isBlueprintOpen}
          onClose={() => setIsBlueprintOpen(false)}
        />
      </div>

      {/* ==================================================================== */}
      {/* PERSISTENT TERMINAL SANDBOX HOME                                     */}
      {/* ==================================================================== */}
      <TerminalSandboxHome />
    </main>
  );
}

export default function CortexOSApp() {
  return (
    <AgentOSProvider>
      <CortexOSShell />
    </AgentOSProvider>
  );
}
