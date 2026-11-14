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
  closeWorkspaceState,
  dedupActivityFeed,
  DOCK_AGENTS_SEED,
  INITIAL_ACTIVITY_FEED,
  INITIAL_ARTIFACT_FEED,
  INITIAL_KNOWLEDGE_FEED,
  INITIAL_TERMINAL_HISTORY,
  mergeAgentTelemetry,
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
  type PendingApprovalItem,
  type ProjectContextSummary,
  type ProviderId,
  type RiskAlertItem,
  type RuntimeCouncilReport,
  type RuntimePresenceSnapshot,
  type RuntimeWorkRequestRecord,
  type RuntimeWorkflowRecord,
  type TerminalTraceEntry,
  type TerminalTraceStep,
  type WorkspaceKind,
  type WorkspaceMode,
  type WorkspaceWindowState,
  type WsConnectionStatus,
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

  workflows: RuntimeWorkflowRecord[];
  workRequests: RuntimeWorkRequestRecord[];
  pendingApprovals: PendingApprovalItem[];
  risks: RiskAlertItem[];
  councilReport: RuntimeCouncilReport | null;

  wsStatus: WsConnectionStatus;
  streamPaused: boolean;
  setStreamPaused: (paused: boolean) => void;
  refreshRuntimeSnapshot: () => Promise<void>;

  ingestKnowledgeItem: (item: Omit<KnowledgeFeedItem, "id" | "updatedAt">) => void;
  advanceProjectPhase: (nextPhase: DockAgentId) => Promise<void>;
  dispatchWorkRequest: (
    studioId: DockAgentId,
    objective: string
  ) => Promise<void>;
  conveneCouncil: (objective: string, studios?: DockAgentId[]) => Promise<void>;
  submitApprovalDecision: (params: {
    approvalId?: string;
    workflowId?: string;
    artifactId?: string;
    approved: boolean;
    feedback?: string;
  }) => Promise<void>;
  triggerProviderFailover: (
    failedProvider: string,
    targetProvider?: string
  ) => Promise<void>;

  selectedProvider: ProviderId;
  setSelectedProvider: (provider: ProviderId) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  terminalExpanded: boolean;
  setTerminalExpanded: (expanded: boolean) => void;
  terminalHistory: TerminalTraceEntry[];
  isExecutingCommand: boolean;
  runTerminalCommand: (command: string, fallbackAgent?: DockAgentId) => Promise<void>;

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

  const [workflows, setWorkflows] = useState<RuntimeWorkflowRecord[]>([]);
  const [workRequests, setWorkRequests] = useState<RuntimeWorkRequestRecord[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalItem[]>([]);
  const [risks, setRisks] = useState<RiskAlertItem[]>([]);
  const [councilReport, setCouncilReport] = useState<RuntimeCouncilReport | null>(null);

  const [wsStatus, setWsStatus] = useState<WsConnectionStatus>("connecting");
  const [streamPaused, setStreamPaused] = useState<boolean>(false);
  const streamPausedRef = useRef<boolean>(false);

  const [selectedProvider, setSelectedProviderState] = useState<ProviderId>("anthropic");
  const [selectedModel, setSelectedModel] = useState<string>("claude-sonnet-4");
  const [terminalExpanded, setTerminalExpanded] = useState<boolean>(false);
  const [terminalHistory, setTerminalHistory] =
    useState<TerminalTraceEntry[]>(INITIAL_TERMINAL_HISTORY);
  const [isExecutingCommand, setIsExecutingCommand] = useState<boolean>(false);

  const [customBrainNodes, setCustomBrainNodes] = useState<BrainNode[]>([]);
  const [selectedBrainNode, setSelectedBrainNode] = useState<BrainNode | null>(null);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState<boolean>(false);

  useEffect(() => {
    streamPausedRef.current = streamPaused;
  }, [streamPaused]);

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

  const applySnapshot = useCallback((snap: RuntimePresenceSnapshot) => {
    if (!snap) return;
    if (Array.isArray(snap.agents) && snap.agents.length > 0) {
      setAgents(snap.agents);
    }
    if (Array.isArray(snap.workflows)) {
      setWorkflows(snap.workflows);
    }
    if (Array.isArray(snap.workRequests)) {
      setWorkRequests(snap.workRequests);
    }
    if (Array.isArray(snap.pendingApprovals)) {
      setPendingApprovals(snap.pendingApprovals);
    }
    if (Array.isArray(snap.risks)) {
      setRisks(snap.risks);
    }
    if (snap.councilReport !== undefined) {
      setCouncilReport(snap.councilReport);
    }
    if (!streamPausedRef.current) {
      if (Array.isArray(snap.activityFeed) && snap.activityFeed.length > 0) {
        setActivityFeed(snap.activityFeed);
      }
      if (Array.isArray(snap.artifactFeed) && snap.artifactFeed.length > 0) {
        setArtifactFeed(snap.artifactFeed);
      }
      if (Array.isArray(snap.knowledgeFeed) && snap.knowledgeFeed.length > 0) {
        setKnowledgeFeed(snap.knowledgeFeed);
      }
    }
    if (snap.projectId && snap.phase) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === snap.projectId ? { ...p, phase: snap.phase } : p
        )
      );
    }
  }, []);

  const refreshRuntimeSnapshot = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/runtime/state?projectId=${encodeURIComponent(activeProjectId)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const snap = (await res.json()) as RuntimePresenceSnapshot;
        applySnapshot(snap);
      }
    } catch {
      // Transient fetch failures recover cleanly on WebSocket reconnect
    }
  }, [activeProjectId, applySnapshot]);

  // Real-time WebSocket subscriber replacing mocked setInterval simulation
  useEffect(() => {
    let active = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let attempt = 0;

    fetch(`/api/runtime/state?projectId=${encodeURIComponent(activeProjectId)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? (res.json() as Promise<RuntimePresenceSnapshot>) : null))
      .then((snap) => {
        if (active && snap) {
          applySnapshot(snap);
        }
      })
      .catch(() => {
        // Transient fetch failures recover cleanly on WebSocket reconnect
      });

    const connect = () => {
      if (!active || typeof window === "undefined") return;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${proto}//${window.location.host}/ws/agent-activity`;

      try {
        ws = new WebSocket(wsUrl);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        if (!active) return;
        attempt = 0;
        setWsStatus("connected");
      };

      ws.onmessage = (evt) => {
        if (!active) return;
        try {
          const frame = JSON.parse(String(evt.data)) as {
            type: string;
            payload: unknown;
          };

          if (frame.type === "presence.snapshot") {
            applySnapshot(frame.payload as RuntimePresenceSnapshot);
            return;
          }

          if (frame.type === "agent.telemetry") {
            const updatedAgent = frame.payload as DockAgentState;
            setAgents((prev) => mergeAgentTelemetry(prev, updatedAgent));
            return;
          }

          if (frame.type === "event.dispatched") {
            if (streamPausedRef.current) return;
            const data = frame.payload as { activity?: AgentActivityEvent };
            if (data.activity) {
              setActivityFeed((prev) => dedupActivityFeed(prev, data.activity!, 30));
            }
            return;
          }

          if (frame.type === "workflow.updated") {
            const wf = frame.payload as RuntimeWorkflowRecord;
            setWorkflows((prev) =>
              [wf, ...prev.filter((item) => item.id !== wf.id)].slice(0, 24)
            );
            return;
          }

          if (frame.type === "work_request.updated") {
            const wr = frame.payload as RuntimeWorkRequestRecord;
            setWorkRequests((prev) =>
              [wr, ...prev.filter((item) => item.id !== wr.id)].slice(0, 24)
            );
            return;
          }

          if (frame.type === "council.updated") {
            setCouncilReport(frame.payload as RuntimeCouncilReport);
          }
        } catch {
          // Ignore unparseable WS frames cleanly
        }
      };

      ws.onclose = () => {
        if (!active) return;
        setWsStatus("reconnecting");
        scheduleReconnect();
      };

      ws.onerror = () => {
        if (!active) return;
        ws?.close();
      };
    };

    const scheduleReconnect = () => {
      if (!active || reconnectTimer !== null) return;
      attempt += 1;
      const delay = Math.min(8000, 1000 * Math.pow(1.5, Math.min(attempt, 5)));
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        if (active) {
          setWsStatus("reconnecting");
          connect();
        }
      }, delay);
    };

    connect();

    return () => {
      active = false;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, [activeProjectId, applySnapshot]);

  const summonAgent = useCallback(
    (agentId: DockAgentId, preferredMode?: WorkspaceMode) => {
      const target =
        agents.find((a) => a.id === agentId) ??
        DOCK_AGENTS_SEED.find((a) => a.id === agentId);
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
    [agents]
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
      void fetch("/api/runtime/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = (await res.json()) as { snapshot: RuntimePresenceSnapshot };
            applySnapshot(data.snapshot);
          }
        })
        .catch(() => null);
    },
    [applySnapshot]
  );

  const advanceProjectPhase = useCallback(
    async (nextPhase: DockAgentId) => {
      try {
        const res = await fetch("/api/runtime/phase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: activeProjectId,
            targetPhase: nextPhase,
            approvedBy: "Owner",
            force: true,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { snapshot: RuntimePresenceSnapshot };
          applySnapshot(data.snapshot);
        }
      } catch {
        // Reconciled automatically by WS
      }
    },
    [activeProjectId, applySnapshot]
  );

  const dispatchWorkRequest = useCallback(
    async (studioId: DockAgentId, objective: string) => {
      const trimmed = objective.trim();
      if (!trimmed) return;
      const res = await fetch("/api/runtime/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProjectId,
          studioId,
          objective: trimmed,
          provider: selectedProvider,
          model: selectedModel,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { snapshot: RuntimePresenceSnapshot };
        applySnapshot(data.snapshot);
      }
    },
    [activeProjectId, applySnapshot, selectedModel, selectedProvider]
  );

  const conveneCouncil = useCallback(
    async (objective: string, studios?: DockAgentId[]) => {
      const res = await fetch("/api/runtime/council", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProjectId,
          objective,
          studios,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { snapshot: RuntimePresenceSnapshot };
        applySnapshot(data.snapshot);
      }
    },
    [activeProjectId, applySnapshot]
  );

  const submitApprovalDecision = useCallback(
    async (params: {
      approvalId?: string;
      workflowId?: string;
      artifactId?: string;
      approved: boolean;
      feedback?: string;
    }) => {
      const res = await fetch("/api/runtime/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProjectId,
          ...params,
          decidedBy: "Owner",
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { snapshot: RuntimePresenceSnapshot };
        applySnapshot(data.snapshot);
      }
    },
    [activeProjectId, applySnapshot]
  );

  const triggerProviderFailover = useCallback(
    async (failedProvider: string, targetProvider?: string) => {
      const res = await fetch("/api/runtime/failover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProjectId,
          failedProvider,
          targetProvider,
          reason: "Operator-triggered failover test",
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          activeProvider: ProviderId;
          snapshot: RuntimePresenceSnapshot;
        };
        if (data.activeProvider) {
          setSelectedProvider(data.activeProvider);
        }
        applySnapshot(data.snapshot);
      }
    },
    [activeProjectId, applySnapshot, setSelectedProvider]
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

      try {
        const res = await fetch("/api/runtime/dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: activeProject.id,
            studioId: targetId,
            objective: parsed.objective,
            provider: selectedProvider,
            model: selectedModel,
            command: trimmed,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            workRequest: RuntimeWorkRequestRecord;
            workflow: RuntimeWorkflowRecord;
            artifact: ArtifactFeedItem;
            summary: string;
            snapshot: RuntimePresenceSnapshot;
          };

          applySnapshot(data.snapshot);

          const steps: TerminalTraceStep[] = [
            {
              phase: "Planning",
              detail: `Jarvis assigned WorkRequest ${data.workRequest.id} via ${data.workflow.workflowType}.`,
            },
            {
              phase: "Executing",
              detail: `${targetAgent.name} executed via ${selectedProvider}/${selectedModel} inside ${data.workflow.taskQueue}.`,
              tool: targetAgent.tools[0],
            },
            {
              phase: "Reviewing",
              detail: `Validated artifact checksum #${data.artifact.checksumPrefix} & synced Librarian pipeline.`,
              tool: targetAgent.tools[1] ?? "quality_gate",
            },
            {
              phase: "Completed",
              detail: `Emitted "${data.artifact.title}" and broadcast Event SDK telemetry via WebSocket.`,
            },
          ];

          const traceEntry: TerminalTraceEntry = {
            id: `term-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            command: trimmed,
            targetAgentId: targetId,
            provider: selectedProvider,
            model: selectedModel,
            contextLayers: [
              `1. Prompt: ${parsed.objective}`,
              `2. Project: ${activeProject.name} (phase=${data.snapshot.phase})`,
              `3. Artifacts: ${data.snapshot.artifactFeed.slice(0, 2).map((a) => a.title).join(", ")}`,
              `4. Workflow: ${data.workflow.workflowType} (${data.workflow.id})`,
              `5. Knowledge: ${data.snapshot.knowledgeFeed.slice(0, 2).map((k) => k.title).join(", ")}`,
              `6. Studio: ${targetAgent.studioId}`,
            ],
            steps,
            outputSummary: data.summary,
            emittedArtifactTitle: data.artifact.title,
          };

          setTerminalHistory((prev) => [traceEntry, ...prev]);
        }
      } finally {
        setIsExecutingCommand(false);
      }
    },
    [activeProject, agents, applySnapshot, selectedModel, selectedProvider]
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
    workflows,
    workRequests,
    pendingApprovals,
    risks,
    councilReport,
    wsStatus,
    streamPaused,
    setStreamPaused,
    refreshRuntimeSnapshot,
    ingestKnowledgeItem,
    advanceProjectPhase,
    dispatchWorkRequest,
    conveneCouncil,
    submitApprovalDecision,
    triggerProviderFailover,
    selectedProvider,
    setSelectedProvider,
    selectedModel,
    setSelectedModel,
    terminalExpanded,
    setTerminalExpanded,
    terminalHistory,
    isExecutingCommand,
    runTerminalCommand,
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
