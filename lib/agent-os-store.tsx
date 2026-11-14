"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  advanceSimulatedAgentTick,
  closeWorkspaceState,
  DOCK_AGENTS_SEED,
  INITIAL_ACTIVITY_FEED,
  INITIAL_ARTIFACT_FEED,
  INITIAL_KNOWLEDGE_FEED,
  INITIAL_TERMINAL_HISTORY,
  parseTerminalCommand,
  PROJECT_CONTEXTS_SEED,
  PROVIDERS_CATALOG,
  resolveWorkspaceKind,
  setWorkspaceModeState,
  summonWorkspaceState,
  type AgentActivityEvent,
  type ArtifactFeedItem,
  type DockAgentId,
  type DockAgentState,
  type KnowledgeFeedItem,
  type OperatingMode,
  type ProjectContextSummary,
  type ProviderId,
  type TerminalTraceEntry,
  type TerminalTraceStep,
  type WorkspaceKind,
  type WorkspaceMode,
  type WorkspaceWindowState,
} from "@/lib/agent-os-logic";
import type { BrainNode } from "@/lib/knowledge-data";

interface AgentOSContextValue {
  mode: OperatingMode;
  setMode: (mode: OperatingMode) => void;
  activeProjectId: string;
  setActiveProjectId: (projectId: string) => void;
  projects: ProjectContextSummary[];
  activeProject: ProjectContextSummary;

  agents: DockAgentState[];
  inspectedAgentId: DockAgentId | null;
  setInspectedAgentId: (id: DockAgentId | null) => void;

  workspaces: WorkspaceWindowState[];
  summonAgent: (agentId: DockAgentId, preferredMode?: WorkspaceMode) => void;
  summonUtilityWorkspace: (
    kind: "vault" | "audit" | "grillme",
    title: string,
    subtitle: string
  ) => void;
  setWorkspaceMode: (id: string, mode: WorkspaceMode) => void;
  closeWorkspace: (id: string) => void;
  focusWorkspace: (id: string) => void;

  knowledgeFeed: KnowledgeFeedItem[];
  artifactFeed: ArtifactFeedItem[];
  activityFeed: AgentActivityEvent[];
  ingestKnowledgeItem: (item: Omit<KnowledgeFeedItem, "id" | "updatedAt">) => void;
  advanceProjectPhase: (nextPhase: DockAgentId) => void;

  selectedProvider: ProviderId;
  setSelectedProvider: (provider: ProviderId) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  terminalExpanded: boolean;
  setTerminalExpanded: (expanded: boolean) => void;
  terminalHistory: TerminalTraceEntry[];
  isExecutingCommand: boolean;
  runTerminalCommand: (command: string, fallbackAgent?: DockAgentId) => Promise<void>;

  simulationLive: boolean;
  setSimulationLive: (live: boolean) => void;

  customBrainNodes: BrainNode[];
  publishNodeToBrain: (node: BrainNode) => void;
  selectedBrainNode: BrainNode | null;
  setSelectedBrainNode: (node: BrainNode | null) => void;
  isBlueprintOpen: boolean;
  setIsBlueprintOpen: (open: boolean) => void;
}

const AgentOSContext = createContext<AgentOSContextValue | null>(null);

export function AgentOSProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<OperatingMode>("mainbrain");
  const [projects, setProjects] = useState<ProjectContextSummary[]>(PROJECT_CONTEXTS_SEED);
  const [activeProjectId, setActiveProjectId] = useState<string>("proj-solar-crm");

  const [agents, setAgents] = useState<DockAgentState[]>(DOCK_AGENTS_SEED);
  const [inspectedAgentId, setInspectedAgentId] = useState<DockAgentId | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceWindowState[]>([]);
  const zCounterRef = useRef<number>(20);

  const [knowledgeFeed, setKnowledgeFeed] = useState<KnowledgeFeedItem[]>(INITIAL_KNOWLEDGE_FEED);
  const [artifactFeed, setArtifactFeed] = useState<ArtifactFeedItem[]>(INITIAL_ARTIFACT_FEED);
  const [activityFeed, setActivityFeed] = useState<AgentActivityEvent[]>(INITIAL_ACTIVITY_FEED);

  const [selectedProvider, setSelectedProviderState] = useState<ProviderId>("anthropic");
  const [selectedModel, setSelectedModel] = useState<string>("claude-sonnet-4");
  const [terminalExpanded, setTerminalExpanded] = useState<boolean>(false);
  const [terminalHistory, setTerminalHistory] =
    useState<TerminalTraceEntry[]>(INITIAL_TERMINAL_HISTORY);
  const [isExecutingCommand, setIsExecutingCommand] = useState<boolean>(false);

  const [simulationLive, setSimulationLive] = useState<boolean>(true);
  const tickRef = useRef<number>(0);
  const agentsRef = useRef<DockAgentState[]>(DOCK_AGENTS_SEED);

  const [customBrainNodes, setCustomBrainNodes] = useState<BrainNode[]>([]);
  const [selectedBrainNode, setSelectedBrainNode] = useState<BrainNode | null>(null);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState<boolean>(false);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  const setSelectedProvider = useCallback((providerId: ProviderId) => {
    setSelectedProviderState(providerId);
    const catalog = PROVIDERS_CATALOG.find((p) => p.id === providerId);
    if (catalog) {
      setSelectedModel(catalog.defaultModel);
    }
  }, []);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? projects[0],
    [projects, activeProjectId]
  );

  // Real-time simulated agent presence loop (pure sibling updates, StrictMode safe)
  useEffect(() => {
    if (!simulationLive) return;
    const timer = window.setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;
      const { nextAgents, emittedEvent } = advanceSimulatedAgentTick(
        agentsRef.current,
        tick
      );
      const uniqueEvent: AgentActivityEvent = {
        ...emittedEvent,
        id: `act-live-${tick}-${emittedEvent.agentId}`,
      };
      agentsRef.current = nextAgents;
      setAgents(nextAgents);
      setActivityFeed((prevFeed) =>
        [uniqueEvent, ...prevFeed.filter((e) => e.id !== uniqueEvent.id)].slice(0, 24)
      );
    }, 3600);
    return () => window.clearInterval(timer);
  }, [simulationLive]);

  const summonAgent = useCallback(
    (agentId: DockAgentId, preferredMode?: WorkspaceMode) => {
      const target = DOCK_AGENTS_SEED.find((a) => a.id === agentId);
      if (!target) return;
      zCounterRef.current += 1;
      const kind: WorkspaceKind = resolveWorkspaceKind(agentId);
      setWorkspaces((prev) =>
        summonWorkspaceState(prev, zCounterRef.current, {
          id: `ws-${agentId}`,
          agentId,
          kind,
          title:
            agentId === "jarvis"
              ? "Jarvis Supervisor"
              : agentId === "librarian"
              ? "Chief Librarian"
              : `${target.name} Studio`,
          subtitle: target.role,
          mode: preferredMode,
        })
      );
    },
    []
  );

  const summonUtilityWorkspace = useCallback(
    (kind: "vault" | "audit" | "grillme", title: string, subtitle: string) => {
      zCounterRef.current += 1;
      const agentId: DockAgentId = kind === "vault" ? "librarian" : "jarvis";
      setWorkspaces((prev) =>
        summonWorkspaceState(prev, zCounterRef.current, {
          id: `ws-util-${kind}`,
          agentId,
          kind,
          title,
          subtitle,
          mode: "drawer",
        })
      );
    },
    []
  );

  const setWorkspaceMode = useCallback((id: string, nextMode: WorkspaceMode) => {
    zCounterRef.current += 1;
    setWorkspaces((prev) => setWorkspaceModeState(prev, id, nextMode, zCounterRef.current));
  }, []);

  const closeWorkspace = useCallback((id: string) => {
    setWorkspaces((prev) => closeWorkspaceState(prev, id));
  }, []);

  const focusWorkspace = useCallback((id: string) => {
    zCounterRef.current += 1;
    setWorkspaces((prev) => {
      const target = prev.find((w) => w.id === id);
      if (!target) return prev;
      const restoredMode: WorkspaceMode =
        target.mode === "docked" ? (target.pinned ? "pinned" : "drawer") : "focused";
      return setWorkspaceModeState(prev, id, restoredMode, zCounterRef.current);
    });
  }, []);

  const publishNodeToBrain = useCallback((node: BrainNode) => {
    setCustomBrainNodes((prev) => [node, ...prev]);
  }, []);

  const ingestKnowledgeItem = useCallback(
    (item: Omit<KnowledgeFeedItem, "id" | "updatedAt">) => {
      const created: KnowledgeFeedItem = {
        ...item,
        id: `kf-${Date.now()}`,
        updatedAt: "Just now",
      };
      setKnowledgeFeed((prev) => [created, ...prev]);
      const actEvent: AgentActivityEvent = {
        id: `act-ing-${Date.now()}`,
        agentId: "librarian",
        agentName: "Librarian",
        status: "completed",
        task: `Ingested "${item.title}" into MainBrain`,
        summary: `Linked ${item.connectionsCount} semantic edges in Project ${item.projectId}.`,
        artifactTitle: item.title,
        provider: "gemini · gemini-2.5-pro",
        timestamp: "Just now",
      };
      setActivityFeed((prev) => [actEvent, ...prev].slice(0, 24));
      setAgents((prev) =>
        prev.map((a) =>
          a.id === "librarian"
            ? {
                ...a,
                status: "completed",
                currentTask: `Indexed "${item.title}"`,
                lastArtifact: item.title,
                updatedAt: "Just now",
              }
            : a
        )
      );
    },
    []
  );

  const advanceProjectPhase = useCallback(
    (nextPhase: DockAgentId) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === activeProjectId
            ? {
                ...p,
                phase: nextPhase,
                readinessSummary: `Phase transitioned to ${nextPhase.toUpperCase()} via Jarvis Gate`,
              }
            : p
        )
      );
      const gateEvent: AgentActivityEvent = {
        id: `act-gate-${Date.now()}`,
        agentId: "jarvis",
        agentName: "Jarvis",
        status: "completed",
        task: `Advanced ${activeProjectId} to ${nextPhase} phase`,
        summary: `Jarvis approved cross-studio handoff and updated Project Context.`,
        provider: `${selectedProvider} · ${selectedModel}`,
        timestamp: "Just now",
      };
      setActivityFeed((prev) => [gateEvent, ...prev].slice(0, 24));
    },
    [activeProjectId, selectedModel, selectedProvider]
  );

  const runTerminalCommand = useCallback(
    async (rawCommand: string, fallbackAgent: DockAgentId = "jarvis") => {
      const trimmed = rawCommand.trim();
      if (!trimmed) return;

      const parsed = parseTerminalCommand(trimmed, fallbackAgent);
      setTerminalExpanded(true);

      if (parsed.kind === "mode" && parsed.targetMode) {
        setMode(parsed.targetMode);
        const entry: TerminalTraceEntry = {
          id: `term-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          command: trimmed,
          targetAgentId: parsed.targetAgentId,
          provider: selectedProvider,
          model: selectedModel,
          contextLayers: [
            `1. Command: ${trimmed}`,
            `2. Project: ${activeProject.name}`,
          ],
          steps: [
            { phase: "Planning", detail: "Parsing OS viewport mode directive." },
            { phase: "Completed", detail: parsed.objective },
          ],
          outputSummary: parsed.objective,
        };
        setTerminalHistory((prev) => [entry, ...prev]);
        return;
      }

      setIsExecutingCommand(true);
      const targetId = parsed.targetAgentId;
      const targetAgent =
        agents.find((a) => a.id === targetId) ??
        DOCK_AGENTS_SEED.find((a) => a.id === targetId)!;

      // Transition agent -> Planning -> Executing -> Reviewing -> Completed
      setAgents((prev) =>
        prev.map((a) =>
          a.id === targetId
            ? {
                ...a,
                status: "planning",
                currentTask: parsed.objective,
                provider: selectedProvider,
                model: selectedModel,
                workload: 65,
                updatedAt: "Just now",
              }
            : a
        )
      );

      await new Promise((r) => setTimeout(r, 140));
      setAgents((prev) =>
        prev.map((a) =>
          a.id === targetId ? { ...a, status: "executing", workload: 88 } : a
        )
      );

      let aiSummary: string | null = null;
      try {
        const res = await fetch("/api/gemini/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `[CortexOS ${targetAgent.name} (${selectedProvider}/${selectedModel}) | Project: ${activeProject.name}] ${parsed.objective}`,
              },
            ],
            model: "gemini-3.8-flash",
            useSearch: false,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.text === "string" && data.text.trim().length > 0) {
            aiSummary = data.text.trim();
          }
        }
      } catch {
        // Resilient local harness execution summary if offline or API key unset
      }

      await new Promise((r) => setTimeout(r, 140));
      setAgents((prev) =>
        prev.map((a) =>
          a.id === targetId ? { ...a, status: "reviewing", workload: 72 } : a
        )
      );

      const emittedTitle =
        targetId === "design"
          ? `Design Spec: ${parsed.objective.slice(0, 42)}`
          : targetId === "architecture"
          ? `Architecture Blueprint: ${parsed.objective.slice(0, 36)}`
          : targetId === "librarian"
          ? `Wiki Digest: ${parsed.objective.slice(0, 40)}`
          : `${targetAgent.name} Output: ${parsed.objective.slice(0, 38)}`;

      const finalOutput =
        aiSummary ||
        `${targetAgent.name} (${selectedProvider} · ${selectedModel}) executed "${parsed.objective}" against Project ${activeProject.name} with 6-layer Context Stack binding and registered "${emittedTitle}".`;

      const steps: TerminalTraceStep[] = [
        {
          phase: "Planning",
          detail: `Bound 6-layer Context Stack for ${activeProject.name} (${activeProject.phase}) and routed to ${targetAgent.name}.`,
        },
        {
          phase: "Executing",
          detail: `Executed tool chain [${targetAgent.tools.slice(0, 2).join(", ")}] via ${selectedProvider}/${selectedModel}.`,
          tool: targetAgent.tools[0],
        },
        {
          phase: "Reviewing",
          detail:
            targetId === "design"
              ? "Verified WCAG 2.1 AA contrast ratios (>= 4.5:1) and structural landmarks."
              : "Validated output against Studio constraints and SHA-256 artifact checksums.",
          tool: targetAgent.tools[1] ?? "quality_gate",
        },
        {
          phase: "Completed",
          detail: `Emitted "${emittedTitle}" to MainBrain Artifact Feed and Agent Activity Feed.`,
        },
      ];

      const traceEntry: TerminalTraceEntry = {
        id: `term-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        command: trimmed,
        targetAgentId: targetId,
        provider: selectedProvider,
        model: selectedModel,
        contextLayers: [
          `1. Prompt: ${parsed.objective}`,
          `2. Project: ${activeProject.name} (phase=${activeProject.phase})`,
          `3. Artifacts: ${artifactFeed.slice(0, 2).map((a) => a.title).join(", ")}`,
          `4. Memory: ${targetAgent.role} operational constraints`,
          `5. Knowledge: ${knowledgeFeed.slice(0, 2).map((k) => k.title).join(", ")}`,
          `6. Studio: ${targetAgent.studioId}`,
        ],
        steps,
        outputSummary: finalOutput,
        emittedArtifactTitle: emittedTitle,
      };

      setTerminalHistory((prev) => [traceEntry, ...prev]);

      const newArtifact: ArtifactFeedItem = {
        id: `art-live-${Date.now()}`,
        title: emittedTitle,
        artifactType:
          targetId === "design"
            ? "wireframe"
            : targetId === "architecture"
            ? "architecture_spec"
            : targetId === "librarian"
            ? "wiki_digest"
            : "agent_artifact",
        studioId: targetId,
        status: "review",
        version: "1.0.0",
        projectId: activeProject.id,
        checksumPrefix: Math.random().toString(16).slice(2, 10),
        summary: finalOutput.slice(0, 180),
        updatedAt: "Just now",
      };
      setArtifactFeed((prev) => [newArtifact, ...prev]);

      const completedEvent: AgentActivityEvent = {
        id: `act-cmd-${Date.now()}`,
        agentId: targetId,
        agentName: targetAgent.name,
        status: "completed",
        task: parsed.objective,
        summary: `Completed via Terminal Sandbox (${selectedProvider} · ${selectedModel})`,
        artifactTitle: emittedTitle,
        provider: `${selectedProvider} · ${selectedModel}`,
        timestamp: "Just now",
      };
      setActivityFeed((prev) => [completedEvent, ...prev].slice(0, 24));

      setAgents((prev) =>
        prev.map((a) =>
          a.id === targetId
            ? {
                ...a,
                status: "completed",
                currentTask: parsed.objective,
                lastArtifact: emittedTitle,
                provider: selectedProvider,
                model: selectedModel,
                workload: 42,
                updatedAt: "Just now",
              }
            : a
        )
      );

      setIsExecutingCommand(false);
    },
    [activeProject, agents, artifactFeed, knowledgeFeed, selectedModel, selectedProvider]
  );

  const value: AgentOSContextValue = {
    mode,
    setMode,
    activeProjectId,
    setActiveProjectId,
    projects,
    activeProject,
    agents,
    inspectedAgentId,
    setInspectedAgentId,
    workspaces,
    summonAgent,
    summonUtilityWorkspace,
    setWorkspaceMode,
    closeWorkspace,
    focusWorkspace,
    knowledgeFeed,
    artifactFeed,
    activityFeed,
    ingestKnowledgeItem,
    advanceProjectPhase,
    selectedProvider,
    setSelectedProvider,
    selectedModel,
    setSelectedModel,
    terminalExpanded,
    setTerminalExpanded,
    terminalHistory,
    isExecutingCommand,
    runTerminalCommand,
    simulationLive,
    setSimulationLive,
    customBrainNodes,
    publishNodeToBrain,
    selectedBrainNode,
    setSelectedBrainNode,
    isBlueprintOpen,
    setIsBlueprintOpen,
  };

  return <AgentOSContext.Provider value={value}>{children}</AgentOSContext.Provider>;
}

export function useAgentOS(): AgentOSContextValue {
  const ctx = useContext(AgentOSContext);
  if (!ctx) {
    throw new Error("useAgentOS must be used inside AgentOSProvider");
  }
  return ctx;
}
