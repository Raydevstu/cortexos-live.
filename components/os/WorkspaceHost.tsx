"use client";

import React, { useEffect } from "react";
import { motion } from "motion/react";
import { Layers, Maximize2, X } from "lucide-react";
import { useAgentOS } from "@/lib/agent-os-store";
import { partitionWorkspaces } from "@/components/os/WorkspaceManager";
import AgentWorkspace from "@/components/os/AgentWorkspace";
import JarvisWorkspace from "@/components/os/JarvisWorkspace";
import LibrarianWorkspace from "@/components/os/LibrarianWorkspace";
import StudioWorkspace from "@/components/os/StudioWorkspace";
import AuditEngine from "@/components/AuditEngine";
import GrillMeInterviewer from "@/components/GrillMeInterviewer";
import VaultExplorer from "@/components/VaultExplorer";
import type { WorkspaceWindowState } from "@/lib/agent-os-logic";

function WorkspaceBody({ win }: { win: WorkspaceWindowState }) {
  const { ingestKnowledgeItem, activeProject, publishNodeToBrain } = useAgentOS();

  if (win.kind === "jarvis") return <JarvisWorkspace />;
  if (win.kind === "librarian") return <LibrarianWorkspace />;
  if (win.kind === "audit") {
    return (
      <div className="rounded-md overflow-hidden bg-[#0b0e14] border border-white/10">
        <AuditEngine />
      </div>
    );
  }
  if (win.kind === "grillme") {
    return (
      <div className="rounded-md overflow-hidden bg-[#0b0e14] border border-white/10">
        <GrillMeInterviewer />
      </div>
    );
  }
  if (win.kind === "vault") {
    return (
      <div className="rounded-md overflow-hidden bg-[#0b0e14] border border-white/10">
        <VaultExplorer
          onIngestToGraph={(title, summary) => {
            ingestKnowledgeItem({
              kind: "wiki",
              title,
              summary,
              projectId: activeProject.id,
              author: "Chief Librarian",
              connectionsCount: 4,
            });
            publishNodeToBrain({
              id: `node-vault-${Date.now()}`,
              title,
              category: "Wiki Page",
              kind: "note",
              area: "system",
              summary,
              notes: `# ${title}\n\n${summary}`,
              stalenessDays: 0,
              needsAttention: false,
              connections: ["node-chief-librarian", "node-cortex-engine"],
              tags: ["vault-ingested"],
              x: 28,
              y: 20,
              z: -18,
              radius: 6,
              isKeyAnchor: true,
            });
          }}
        />
      </div>
    );
  }

  return <StudioWorkspace agentId={win.agentId} />;
}

export default function WorkspaceHost() {
  const {
    agents,
    workspaces,
    setWorkspaceMode,
    closeWorkspace,
    focusWorkspace,
    runTerminalCommand,
  } = useAgentOS();

  const { pinned, floating, focused, docked } = partitionWorkspaces(workspaces);

  // Escape slides out top-most floating or focused workspace
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (focused) {
        closeWorkspace(focused.id);
        return;
      }
      if (floating.length > 0) {
        const top = [...floating].sort((a, b) => b.zIndex - a.zIndex)[0];
        closeWorkspace(top.id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeWorkspace, floating, focused]);

  const renderWindow = (win: WorkspaceWindowState) => {
    const agent = agents.find((a) => a.id === win.agentId) ?? agents[0];
    return (
      <AgentWorkspace
        windowState={win}
        agent={agent}
        onPinToggle={() =>
          setWorkspaceMode(win.id, win.mode === "pinned" ? "drawer" : "pinned")
        }
        onDock={() => setWorkspaceMode(win.id, "docked")}
        onFocusToggle={() =>
          setWorkspaceMode(
            win.id,
            win.mode === "focused" ? (win.pinned ? "pinned" : "drawer") : "focused"
          )
        }
        onClose={() => closeWorkspace(win.id)}
        onRunInTerminal={(cmd) => {
          void runTerminalCommand(cmd, win.agentId);
        }}
      >
        <WorkspaceBody win={win} />
      </AgentWorkspace>
    );
  };

  const topFloating =
    floating.length > 0 ? [...floating].sort((a, b) => b.zIndex - a.zIndex)[0] : null;

  return (
    <>
      {/* Pinned Side Split Rail (lives alongside MainBrain / Brain / War Room) */}
      {pinned.length > 0 && !focused && (
        <motion.aside
          aria-label="Pinned Workspaces Rail"
          data-testid="pinned-workspace-rail"
          initial={{ x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="w-full md:w-[440px] lg:w-[490px] shrink-0 h-full flex flex-col divide-y divide-white/15 bg-[#0f131a] z-20"
        >
          {pinned.map((win) => (
            <div key={win.id} className="flex-1 min-h-0">
              {renderWindow(win)}
            </div>
          ))}
        </motion.aside>
      )}

      {/* Slide-in Floating Drawer */}
      {topFloating && !focused && (
        <motion.aside
          key={topFloating.id}
          aria-label="Summoned Workspace Drawer"
          data-testid="floating-workspace-drawer"
          initial={{ x: 36, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-0 right-0 bottom-0 w-full md:w-[500px] lg:w-[560px] z-30 shadow-2xl"
        >
          {renderWindow(topFloating)}
        </motion.aside>
      )}

      {/* Focused Workspace Overlay */}
      {focused && (
        <motion.aside
          key={`focused-${focused.id}`}
          aria-label="Focused Workspace"
          data-testid="focused-workspace-overlay"
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 md:inset-3 rounded-md overflow-hidden border border-white/20 z-40 shadow-2xl"
        >
          {renderWindow(focused)}
        </motion.aside>
      )}

      {/* Docked (Minimized) Workspaces Tray */}
      {docked.length > 0 && (
        <div
          aria-label="Docked Workspaces Tray"
          data-testid="docked-workspaces-tray"
          className="fixed bottom-[62px] right-6 z-30 flex items-center gap-2 flex-wrap justify-end"
        >
          {docked.map((win) => (
            <div
              key={win.id}
              className="flex items-center gap-1 rounded-md bg-[#141923] border border-white/15 px-2.5 py-1.5 shadow-xl text-xs"
            >
              <button
                type="button"
                aria-label={`Restore ${win.title}`}
                onClick={() => focusWorkspace(win.id)}
                className="inline-flex items-center gap-1.5 text-[#e4e6eb] hover:text-[#00ffa3] font-medium"
              >
                <Layers className="w-3.5 h-3.5 text-[#00ffa3]" aria-hidden="true" />
                <span>{win.title}</span>
                <Maximize2 className="w-3 h-3 opacity-70" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Dismiss docked ${win.title}`}
                onClick={() => closeWorkspace(win.id)}
                className="ml-1 text-slate-400 hover:text-rose-300"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
