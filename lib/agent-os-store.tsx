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
  buildTerminalBrainSyncCompound,
  closeWorkspaceState,
  dedupActivityFeed,
  dedupDecisionFeed,
  dedupToolActivityFeed,
  DOCK_AGENTS_SEED,
  INITIAL_ACTIVITY_FEED,
  INITIAL_ARTIFACT_FEED,
  INITIAL_COUNCIL_CONFLICTS,
  INITIAL_COUNCIL_REPORT_SEED,
  INITIAL_DECISION_FEED,
  INITIAL_KNOWLEDGE_FEED,
  INITIAL_LIBRARIAN_EVOLUTION,
  INITIAL_LIBRARIAN_GRAPH_UPDATES,
  INITIAL_LIBRARIAN_RELATIONSHIPS,
  INITIAL_TERMINAL_HISTORY,
  INITIAL_TOOL_ACTIVITY_FEED,
  INITIAL_WORKFLOW_FEED,
  mergeAgentTelemetry,
  parseTerminalCommand,
  PROJECT_CONTEXTS_SEED,
  PROVIDERS_CATALOG,
  resolveWorkspaceKind,
  setWorkspaceModeState,
  summonWorkspaceState,
  type AgentActivityEvent,
  type ArtifactFeedItem,
  type CouncilConflictItem,
  type DecisionFeedItem,
  type DockAgentId,
  type DockAgentState,
  type KnowledgeFeedItem,
  type LibrarianGraphUpdateItem,
  type LibrarianKnowledgeEvolutionItem,
  type LibrarianRelationshipItem,
  type MainBrainViewMode,
  type OperatingMode,
  type PendingApprovalItem,
  type ProjectContextSummary,
  type ProviderId,
  type RiskAlertItem,
  type RuntimeCouncilReport,
  type RuntimePresenceSnapshot,
  type RuntimeWorkRequestRecord,
  type RuntimeWorkflowRecord,
  type TerminalBrainSyncCompound,
  type TerminalTraceEntry,
  type TerminalTraceStep,
  type ToolActivityFeedItem,
  type WorkspaceKind,
  type WorkspaceMode,
  type WorkspaceWindowState,
  type WsConnectionStatus,
} from "@/lib/agent-os-logic";
import type { BrainNode } from "@/lib/knowledge-data";
import {
  CORTEXOS_MISSIONS,
  WAR_ROOM_PRESETS,
  WAR_ROOM_STORAGE_KEY,
  activateWarRoomPanel as activateWarRoomPanelPure,
  clampZoneDimensions,
  createDefaultWarRoomLayout,
  deriveWarRoomGoldenRuleTelemetry,
  deserializeWarRoomLayout,
  moveWarRoomPanelToZone as moveWarRoomPanelToZonePure,
  serializeWarRoomLayout,
  setWarRoomMaximizedPanel as setWarRoomMaximizedPanelPure,
  toggleWarRoomPanelVisibility as toggleWarRoomPanelVisibilityPure,
  toggleWarRoomZoneCollapsed as toggleWarRoomZoneCollapsedPure,
  type DisclosureLevel,
  type DockZoneId,
  type MissionId,
  type WarRoomGoldenRuleSnapshot,
  type WarRoomLayoutState,
  type WarRoomPanelId,
  type WarRoomPresetId,
  type ZoneDimensions,
} from "@/lib/war-room/workspace-state";

interface AgentOSContextValue {
  mode: OperatingMode;
  setMode: (mode: OperatingMode) => void;
  mainBrainView: MainBrainViewMode;
  setMainBrainView: (view: MainBrainViewMode) => void;
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
  toolActivityFeed: ToolActivityFeedItem[];
  decisionFeed: DecisionFeedItem[];

  librarianRelationships: LibrarianRelationshipItem[];
  librarianGraphUpdates: LibrarianGraphUpdateItem[];
  librarianEvolution: LibrarianKnowledgeEvolutionItem[];
  councilConflicts: CouncilConflictItem[];
  latestTerminalCompound: TerminalBrainSyncCompound | null;

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
  executeStudioTool: (
    studioId: DockAgentId,
    toolName: string,
    parameters?: Record<string, unknown>
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

  // Step 1: War Room Workspace State Foundation (Single Source of Truth)
  disclosureLevel: DisclosureLevel;
  setDisclosureLevel: (level: DisclosureLevel) => void;
  activeMission: MissionId;
  setActiveMission: (mission: MissionId) => void;
  warRoomLayout: WarRoomLayoutState;
  goldenRuleTelemetry: WarRoomGoldenRuleSnapshot;
  applyWarRoomPreset: (presetId: WarRoomPresetId) => void;
  activateWarRoomPanel: (panelId: WarRoomPanelId) => void;
  moveWarRoomPanelToZone: (panelId: WarRoomPanelId, targetZoneId: DockZoneId) => void;
  toggleWarRoomPanelVisibility: (panelId: WarRoomPanelId) => void;
  toggleWarRoomZoneCollapsed: (zoneId: DockZoneId) => void;
  setWarRoomMaximizedPanel: (panelId: WarRoomPanelId | null) => void;
  commitWarRoomZoneDimensions: (partial: Partial<ZoneDimensions>) => void;
}

const AgentOSContext = createContext<AgentOSContextValue | null>(null);

export function AgentOSProvider({ children }: { children: React.ReactNode }) {
  const [modeState, setModeState] = useState<OperatingMode>("mainbrain");
  const [mainBrainView, setMainBrainViewState] = useState<MainBrainViewMode>("feed");
  const [projects, setProjects] = useState<ProjectContextSummary[]>(PROJECT_CONTEXTS_SEED);
  const [activeProjectId, setActiveProjectId] = useState<string>("proj-solar-crm");

  const [agents, setAgents] = useState<DockAgentState[]>(DOCK_AGENTS_SEED);
  const [inspectedAgentId, setInspectedAgentId] = useState<DockAgentId | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceWindowState[]>([]);
  const zCounterRef = useRef<number>(20);

  const [knowledgeFeed, setKnowledgeFeed] = useState<KnowledgeFeedItem[]>(INITIAL_KNOWLEDGE_FEED);
  const [artifactFeed, setArtifactFeed] = useState<ArtifactFeedItem[]>(INITIAL_ARTIFACT_FEED);
  const [activityFeed, setActivityFeed] = useState<AgentActivityEvent[]>(INITIAL_ACTIVITY_FEED);
  const [toolActivityFeed, setToolActivityFeed] =
    useState<ToolActivityFeedItem[]>(INITIAL_TOOL_ACTIVITY_FEED);
  const [decisionFeed, setDecisionFeed] =
    useState<DecisionFeedItem[]>(INITIAL_DECISION_FEED);

  const [librarianRelationships, setLibrarianRelationships] =
    useState<LibrarianRelationshipItem[]>(INITIAL_LIBRARIAN_RELATIONSHIPS);
  const [librarianGraphUpdates, setLibrarianGraphUpdates] =
    useState<LibrarianGraphUpdateItem[]>(INITIAL_LIBRARIAN_GRAPH_UPDATES);
  const [librarianEvolution, setLibrarianEvolution] =
    useState<LibrarianKnowledgeEvolutionItem[]>(INITIAL_LIBRARIAN_EVOLUTION);
  const [councilConflicts] = useState<CouncilConflictItem[]>(INITIAL_COUNCIL_CONFLICTS);
  const [latestTerminalCompound, setLatestTerminalCompound] =
    useState<TerminalBrainSyncCompound | null>(null);

  const [workflows, setWorkflows] = useState<RuntimeWorkflowRecord[]>(INITIAL_WORKFLOW_FEED);
  const [workRequests, setWorkRequests] = useState<RuntimeWorkRequestRecord[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalItem[]>([]);
  const [risks, setRisks] = useState<RiskAlertItem[]>([]);
  const [councilReport, setCouncilReport] =
    useState<RuntimeCouncilReport | null>(INITIAL_COUNCIL_REPORT_SEED);

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

  // Step 1: War Room Workspace State Foundation
  const [disclosureLevel, setDisclosureLevel] = useState<DisclosureLevel>("operator");
  const [activeMission, setActiveMissionState] = useState<MissionId>("build-software");
  const [warRoomLayout, setWarRoomLayout] = useState<WarRoomLayoutState>(() =>
    createDefaultWarRoomLayout("mission-execution")
  );

  // Hydrate War Room layout from localStorage once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const saved = window.localStorage.getItem(WAR_ROOM_STORAGE_KEY);
        if (saved) {
          setWarRoomLayout(deserializeWarRoomLayout(saved));
        }
      } catch {
        // Ignore storage read errors
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const persistAndSetWarRoomLayout = useCallback(
    (updater: (prev: WarRoomLayoutState) => WarRoomLayoutState) => {
      setWarRoomLayout((prev) => {
        const next = updater(prev);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(WAR_ROOM_STORAGE_KEY, serializeWarRoomLayout(next));
          } catch {
            // Ignore storage write errors
          }
        }
        return next;
      });
    },
    []
  );

  const applyWarRoomPreset = useCallback(
    (presetId: WarRoomPresetId) => {
      persistAndSetWarRoomLayout((prev) => {
        const preset = WAR_ROOM_PRESETS[presetId] ?? WAR_ROOM_PRESETS["mission-execution"];
        return preset.createLayout(prev.dimensions);
      });
    },
    [persistAndSetWarRoomLayout]
  );

  const setActiveMission = useCallback(
    (missionId: MissionId) => {
      setActiveMissionState(missionId);
      const missionDef = CORTEXOS_MISSIONS[missionId];
      if (missionDef) {
        applyWarRoomPreset(missionDef.defaultPreset);
      }
    },
    [applyWarRoomPreset]
  );

  const activateWarRoomPanel = useCallback(
    (panelId: WarRoomPanelId) => {
      persistAndSetWarRoomLayout((prev) => activateWarRoomPanelPure(prev, panelId));
    },
    [persistAndSetWarRoomLayout]
  );

  const moveWarRoomPanelToZone = useCallback(
    (panelId: WarRoomPanelId, targetZoneId: DockZoneId) => {
      persistAndSetWarRoomLayout((prev) =>
        moveWarRoomPanelToZonePure(prev, panelId, targetZoneId)
      );
    },
    [persistAndSetWarRoomLayout]
  );

  const toggleWarRoomPanelVisibility = useCallback(
    (panelId: WarRoomPanelId) => {
      persistAndSetWarRoomLayout((prev) => toggleWarRoomPanelVisibilityPure(prev, panelId));
    },
    [persistAndSetWarRoomLayout]
  );

  const toggleWarRoomZoneCollapsed = useCallback(
    (zoneId: DockZoneId) => {
      persistAndSetWarRoomLayout((prev) => toggleWarRoomZoneCollapsedPure(prev, zoneId));
    },
    [persistAndSetWarRoomLayout]
  );

  const setWarRoomMaximizedPanel = useCallback(
    (panelId: WarRoomPanelId | null) => {
      persistAndSetWarRoomLayout((prev) => setWarRoomMaximizedPanelPure(prev, panelId));
    },
    [persistAndSetWarRoomLayout]
  );

  const commitWarRoomZoneDimensions = useCallback(
    (partial: Partial<ZoneDimensions>) => {
      persistAndSetWarRoomLayout((prev) => ({
        ...prev,
        dimensions: clampZoneDimensions(partial, prev.dimensions),
      }));
    },
    [persistAndSetWarRoomLayout]
  );

  useEffect(() => {
    streamPausedRef.current = streamPaused;
  }, [streamPaused]);

  // Brain Graph is now an integrated view inside MainBrain rather than a separate destination
  const setMode = useCallback((nextMode: OperatingMode) => {
    if (nextMode === "brain") {
      setModeState("mainbrain");
      setMainBrainViewState("graph");
      return;
    }
    setModeState(nextMode);
  }, []);

  const setMainBrainView = useCallback((nextView: MainBrainViewMode) => {
    setModeState("mainbrain");
    setMainBrainViewState(nextView);
  }, []);

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
    if (Array.isArray(snap.workflows) && snap.workflows.length > 0) {
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
    if (snap.councilReport) {
      setCouncilReport(snap.councilReport);
      if (Array.isArray(snap.councilReport.decisions) && snap.councilReport.decisions.length > 0) {
        const councilDec: DecisionFeedItem = {
          id: `dec-council-${snap.councilReport.id}`,
          title: snap.councilReport.decisions[0],
          rationale: snap.councilReport.consensusSummary,
          agentId: "jarvis",
          agentName: "Agent Council",
          studioId: "jarvis",
          workflowType: "AgentCouncilWorkflow",
          impact: "governance",
          status: "ratified",
          timestamp: snap.councilReport.createdAt || "Just now",
        };
        setDecisionFeed((prev) => dedupDecisionFeed(prev, councilDec, 40));
      }
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
      if (Array.isArray(snap.toolActivityFeed) && snap.toolActivityFeed.length > 0) {
        setToolActivityFeed(snap.toolActivityFeed);
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

  // Real-time WebSocket subscriber
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

          if (frame.type === "tool.executed") {
            if (streamPausedRef.current) return;
            const item = frame.payload as ToolActivityFeedItem;
            if (item && item.id) {
              setToolActivityFeed((prev) => dedupToolActivityFeed(prev, item, 40));
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
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const created: KnowledgeFeedItem = {
        ...item,
        id: `kf-local-${Date.now()}`,
        updatedAt: now,
      };
      setKnowledgeFeed((prev) => [created, ...prev]);
      setLibrarianRelationships((prev) => [
        {
          id: `rel-local-${Date.now()}`,
          sourceTitle: item.title,
          targetTitle: "MainBrain Operating System Topology",
          relationType: "indexes",
          confidence: 0.97,
          discoveredBy: item.author || "Chief Librarian",
          timestamp: now,
        },
        ...prev,
      ]);
      setLibrarianGraphUpdates((prev) => [
        {
          id: `gup-local-${Date.now()}`,
          action: "node_indexed",
          summary: `Indexed knowledge object "${item.title}" (${item.kind}) into MainBrain graph.`,
          affectedNodes: 1,
          affectedEdges: item.connectionsCount || 3,
          checksumPrefix: Math.random().toString(16).slice(2, 10),
          timestamp: now,
        },
        ...prev,
      ]);
      setLibrarianEvolution((prev) => [
        {
          id: `evo-local-${Date.now()}`,
          conceptTitle: item.title,
          stage: "indexed",
          version: "v1.0",
          deltaSummary: item.summary,
          connectionsCount: item.connectionsCount || 3,
          updatedAt: now,
        },
        ...prev,
      ]);

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
          setDecisionFeed((prev) =>
            dedupDecisionFeed(
              prev,
              {
                id: `dec-phase-${Date.now()}`,
                title: `Advanced Project Lifecycle Phase to ${nextPhase.toUpperCase()}`,
                rationale: `Jarvis Phase Engine verified gate readiness and promoted ${activeProject.name} to ${nextPhase}.`,
                agentId: "jarvis",
                agentName: "Jarvis",
                studioId: "jarvis",
                workflowType: "ProjectLifecycleWorkflow",
                impact: "governance",
                status: "ratified",
                timestamp: "Just now",
              },
              40
            )
          );
        }
      } catch {
        // Reconciled automatically by WS
      }
    },
    [activeProject.name, activeProjectId, applySnapshot]
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
        const data = (await res.json()) as {
          artifact?: ArtifactFeedItem;
          toolExecution?: { toolName: string; durationMs: number };
          snapshot: RuntimePresenceSnapshot;
        };
        applySnapshot(data.snapshot);
        const targetAgent =
          agents.find((a) => a.id === studioId) ??
          DOCK_AGENTS_SEED.find((a) => a.id === studioId)!;
        const bundle = buildTerminalBrainSyncCompound({
          command: `@${studioId} ${trimmed}`,
          agent: targetAgent,
          projectId: activeProjectId,
          toolName: data.toolExecution?.toolName,
          durationMs: data.toolExecution?.durationMs,
          artifact: data.artifact,
        });
        setDecisionFeed((prev) => dedupDecisionFeed(prev, bundle.decisionItem, 40));
        setLibrarianRelationships((prev) => [bundle.relationshipItem, ...prev].slice(0, 20));
        setLibrarianGraphUpdates((prev) => [bundle.graphUpdateItem, ...prev].slice(0, 20));
      }
    },
    [activeProjectId, agents, applySnapshot, selectedModel, selectedProvider]
  );

  const executeStudioTool = useCallback(
    async (
      studioId: DockAgentId,
      toolName: string,
      parameters?: Record<string, unknown>
    ) => {
      const res = await fetch("/api/runtime/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProjectId,
          studioId,
          toolName,
          parameters: parameters ?? {},
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          artifact?: ArtifactFeedItem;
          execution?: { durationMs?: number };
          snapshot: RuntimePresenceSnapshot;
        };
        applySnapshot(data.snapshot);
        const targetAgent =
          agents.find((a) => a.id === studioId) ??
          DOCK_AGENTS_SEED.find((a) => a.id === studioId)!;
        const bundle = buildTerminalBrainSyncCompound({
          command: `${toolName}(${JSON.stringify(parameters ?? {}).slice(0, 40)})`,
          agent: targetAgent,
          projectId: activeProjectId,
          toolName,
          durationMs: data.execution?.durationMs ?? 16,
          artifact: data.artifact,
        });
        setDecisionFeed((prev) => dedupDecisionFeed(prev, bundle.decisionItem, 40));
        setLibrarianRelationships((prev) => [bundle.relationshipItem, ...prev].slice(0, 20));
        setLibrarianGraphUpdates((prev) => [bundle.graphUpdateItem, ...prev].slice(0, 20));
      }
    },
    [activeProjectId, agents, applySnapshot]
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

      const targetId = parsed.targetAgentId;
      const targetAgent =
        agents.find((a) => a.id === targetId) ??
        DOCK_AGENTS_SEED.find((a) => a.id === targetId)!;

      if (parsed.kind === "mode" && parsed.targetMode) {
        setMode(parsed.targetMode);
        const modeBundle = buildTerminalBrainSyncCompound({
          command: trimmed,
          agent: targetAgent,
          projectId: activeProject.id,
          toolName: "terminal.exec",
          durationMs: 8,
        });
        setLatestTerminalCompound(modeBundle.compound);
        setToolActivityFeed((prev) => dedupToolActivityFeed(prev, modeBundle.toolItem, 40));
        setArtifactFeed((prev) => [modeBundle.artifactItem, ...prev]);
        setKnowledgeFeed((prev) => [modeBundle.knowledgeItem, ...prev]);
        setDecisionFeed((prev) => dedupDecisionFeed(prev, modeBundle.decisionItem, 40));
        setLibrarianRelationships((prev) => [modeBundle.relationshipItem, ...prev].slice(0, 20));
        setLibrarianGraphUpdates((prev) => [modeBundle.graphUpdateItem, ...prev].slice(0, 20));

        const entry: TerminalTraceEntry = {
          id: `term-${Date.now()}`,
          timestamp: modeBundle.compound.timestamp,
          command: trimmed,
          targetAgentId: parsed.targetAgentId,
          provider: selectedProvider,
          model: selectedModel,
          contextLayers: [
            `1. Command: ${trimmed}`,
            `2. Project: ${activeProject.name}`,
          ],
          steps: [
            { phase: "Planning", detail: "Parsing MainBrain view/mode directive." },
            { phase: "Completed", detail: parsed.objective, tool: "terminal.exec" },
          ],
          outputSummary: parsed.objective,
          emittedArtifactTitle: modeBundle.artifactItem.title,
          emittedKnowledgeTitle: modeBundle.knowledgeItem.title,
          emittedDecisionTitle: modeBundle.decisionItem.title,
          auditEntryId: modeBundle.compound.auditEntryId,
          executionRecordId: modeBundle.compound.executionRecordId,
        };
        setTerminalHistory((prev) => [entry, ...prev]);
        return;
      }

      setIsExecutingCommand(true);

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
            toolExecution?: { toolName: string; durationMs: number; resultSummary: string };
            summary: string;
            snapshot: RuntimePresenceSnapshot;
          };

          applySnapshot(data.snapshot);

          const executedToolName = data.toolExecution?.toolName || targetAgent.tools[0];
          const executedDuration = data.toolExecution?.durationMs ?? 12;

          // Synchronize Terminal command with MainBrain:
          // Execution Record + Artifact + Knowledge Candidate + Decision + Audit Entry
          const syncBundle = buildTerminalBrainSyncCompound({
            command: trimmed,
            agent: targetAgent,
            projectId: activeProject.id,
            toolName: executedToolName,
            durationMs: executedDuration,
            artifact: data.artifact,
          });

          setLatestTerminalCompound(syncBundle.compound);
          setDecisionFeed((prev) => dedupDecisionFeed(prev, syncBundle.decisionItem, 40));
          setLibrarianRelationships((prev) => [syncBundle.relationshipItem, ...prev].slice(0, 20));
          setLibrarianGraphUpdates((prev) => [syncBundle.graphUpdateItem, ...prev].slice(0, 20));
          setLibrarianEvolution((prev) => [
            {
              id: `evo-term-${Date.now()}`,
              conceptTitle: syncBundle.knowledgeItem.title,
              stage: "indexed",
              version: "v1.1",
              deltaSummary: `Compounded from terminal command "${trimmed}" via ${executedToolName}.`,
              connectionsCount: 6,
              updatedAt: syncBundle.compound.timestamp,
            },
            ...prev.slice(0, 15),
          ]);

          // Also publish a live node to the integrated Brain Graph
          publishNodeToBrain({
            id: `node-term-${Date.now()}`,
            title: data.artifact.title,
            category: "Wiki Page",
            kind: "concept",
            area: "system",
            summary: data.summary,
            notes: `# ${data.artifact.title}\n\nCommand: \`${trimmed}\`\nDecision: ${syncBundle.decisionItem.title}\nAudit: ${syncBundle.compound.auditEntryId}`,
            stalenessDays: 0,
            needsAttention: false,
            connections: ["node-cortex-engine", "node-chief-librarian"],
            tags: ["terminal-synced", targetId],
            x: 20,
            y: 14,
            z: -12,
            radius: 6,
            isKeyAnchor: true,
          });

          const steps: TerminalTraceStep[] = [
            {
              phase: "Planning",
              detail: `Jarvis assigned WorkRequest ${data.workRequest.id} via ${data.workflow.workflowType}.`,
            },
            {
              phase: "Executing",
              detail: `${targetAgent.name} executed tool '${executedToolName}' (${executedDuration}ms) via ${selectedProvider}/${selectedModel} inside ${data.workflow.taskQueue}.`,
              tool: executedToolName,
            },
            {
              phase: "Reviewing",
              detail: `Validated artifact checksum #${data.artifact.checksumPrefix} & ratified Decision "${syncBundle.decisionItem.title}".`,
              tool: targetAgent.tools[1] ?? "quality_gate",
            },
            {
              phase: "Completed",
              detail: `Synchronized Execution Record (${syncBundle.compound.executionRecordId}), Artifact ("${data.artifact.title}"), Knowledge Candidate, Decision, and Audit Entry (${syncBundle.compound.auditEntryId}) into MainBrain.`,
            },
          ];

          const traceEntry: TerminalTraceEntry = {
            id: `term-${Date.now()}`,
            timestamp: syncBundle.compound.timestamp,
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
              `6. Studio: ${targetAgent.studioId} (tool=${executedToolName})`,
            ],
            steps,
            outputSummary: data.summary,
            emittedArtifactTitle: data.artifact.title,
            emittedKnowledgeTitle: syncBundle.knowledgeItem.title,
            emittedDecisionTitle: syncBundle.decisionItem.title,
            auditEntryId: syncBundle.compound.auditEntryId,
            executionRecordId: syncBundle.compound.executionRecordId,
          };

          setTerminalHistory((prev) => [traceEntry, ...prev]);
        }
      } finally {
        setIsExecutingCommand(false);
      }
    },
    [activeProject, agents, applySnapshot, publishNodeToBrain, selectedModel, selectedProvider, setMode]
  );

  const goldenRuleTelemetry = useMemo(
    () =>
      deriveWarRoomGoldenRuleTelemetry({
        activeMission,
        activeProject,
        agents,
        selectedProvider,
        selectedModel,
        isExecutingCommand,
        workflows,
        toolActivityFeed,
        artifactFeed,
        activityFeed,
        pendingApprovals,
        latestTerminalCompound,
      }),
    [
      activeMission,
      activeProject,
      agents,
      selectedProvider,
      selectedModel,
      isExecutingCommand,
      workflows,
      toolActivityFeed,
      artifactFeed,
      activityFeed,
      pendingApprovals,
      latestTerminalCompound,
    ]
  );

  const value: AgentOSContextValue = {
    mode: modeState,
    setMode,
    mainBrainView,
    setMainBrainView,
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
    toolActivityFeed,
    decisionFeed,
    librarianRelationships,
    librarianGraphUpdates,
    librarianEvolution,
    councilConflicts,
    latestTerminalCompound,
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
    executeStudioTool,
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
    disclosureLevel,
    setDisclosureLevel,
    activeMission,
    setActiveMission,
    warRoomLayout,
    goldenRuleTelemetry,
    applyWarRoomPreset,
    activateWarRoomPanel,
    moveWarRoomPanelToZone,
    toggleWarRoomPanelVisibility,
    toggleWarRoomZoneCollapsed,
    setWarRoomMaximizedPanel,
    commitWarRoomZoneDimensions,
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

