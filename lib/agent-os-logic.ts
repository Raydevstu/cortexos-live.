export type DockAgentId =
  | "jarvis"
  | "librarian"
  | "discovery"
  | "product"
  | "design"
  | "architecture"
  | "development"
  | "qa"
  | "release";

export type AgentLifecycleStatus =
  | "idle"
  | "planning"
  | "executing"
  | "reviewing"
  | "completed"
  | "blocked"
  | "failed";

export type OperatingMode = "mainbrain" | "brain" | "warroom";

export type WorkspaceMode = "drawer" | "pinned" | "docked" | "focused";

export type WorkspaceKind =
  | "jarvis"
  | "librarian"
  | "studio"
  | "vault"
  | "audit"
  | "grillme";

export type ProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "grok"
  | "deepseek"
  | "openrouter"
  | "ollama"
  | "lmstudio";

export interface ProviderCatalogEntry {
  id: ProviderId;
  name: string;
  models: string[];
  defaultModel: string;
  capabilities: string[];
  locality: "cloud" | "local";
}

export interface DockAgentState {
  id: DockAgentId;
  name: string;
  role: string;
  studioId: string;
  mission: string;
  status: AgentLifecycleStatus;
  currentTask: string;
  health: number;
  provider: string;
  model: string;
  lastArtifact: string;
  workload: number;
  tools: string[];
  capabilities: string[];
  updatedAt: string;
}

export interface WorkspaceWindowState {
  id: string;
  agentId: DockAgentId;
  kind: WorkspaceKind;
  title: string;
  subtitle: string;
  mode: WorkspaceMode;
  zIndex: number;
  pinned: boolean;
  openedAt: string;
}

export interface KnowledgeFeedItem {
  id: string;
  kind: "concept" | "decision" | "pattern" | "wiki";
  title: string;
  summary: string;
  projectId: string;
  author: string;
  updatedAt: string;
  connectionsCount: number;
}

export interface ArtifactFeedItem {
  id: string;
  title: string;
  artifactType: string;
  studioId: DockAgentId;
  status: "draft" | "review" | "approved" | "indexed" | "connected";
  version: string;
  projectId: string;
  checksumPrefix: string;
  summary: string;
  updatedAt: string;
}

export interface AgentActivityEvent {
  id: string;
  agentId: DockAgentId;
  agentName: string;
  status: AgentLifecycleStatus;
  task: string;
  summary: string;
  artifactTitle?: string;
  provider: string;
  timestamp: string;
}

export interface ProjectContextSummary {
  id: string;
  name: string;
  phase: DockAgentId;
  objective: string;
  constraints: string[];
  readinessSummary: string;
  activeOwners: string[];
}

export interface TerminalTraceStep {
  phase: "Planning" | "Executing" | "Reviewing" | "Completed";
  detail: string;
  tool?: string;
}

export interface TerminalTraceEntry {
  id: string;
  timestamp: string;
  command: string;
  targetAgentId: DockAgentId;
  provider: string;
  model: string;
  steps: TerminalTraceStep[];
  outputSummary: string;
  emittedArtifactTitle?: string;
  contextLayers: string[];
}

export const CANONICAL_DOCK_ORDER: readonly DockAgentId[] = [
  "jarvis",
  "librarian",
  "discovery",
  "product",
  "design",
  "architecture",
  "development",
  "qa",
  "release",
];

export const PROVIDERS_CATALOG: readonly ProviderCatalogEntry[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    models: ["claude-sonnet-4", "claude-opus-4"],
    defaultModel: "claude-sonnet-4",
    capabilities: ["Reasoning", "Coding", "Tools", "Agent"],
    locality: "cloud",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    models: ["gemini-2.5-pro", "gemini-2.5-flash"],
    defaultModel: "gemini-2.5-pro",
    capabilities: ["Reasoning", "Vision", "Tools", "Agent"],
    locality: "cloud",
  },
  {
    id: "openai",
    name: "OpenAI",
    models: ["gpt-4.1", "o3-mini"],
    defaultModel: "gpt-4.1",
    capabilities: ["Chat", "Coding", "Tools", "Agent"],
    locality: "cloud",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    models: ["deepseek-r1", "deepseek-chat"],
    defaultModel: "deepseek-r1",
    capabilities: ["Reasoning", "Coding", "Agent"],
    locality: "cloud",
  },
  {
    id: "grok",
    name: "Grok",
    models: ["grok-3", "grok-3-mini"],
    defaultModel: "grok-3",
    capabilities: ["Chat", "Reasoning", "Tools"],
    locality: "cloud",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    models: ["openrouter/auto", "anthropic/claude-3.7-sonnet"],
    defaultModel: "openrouter/auto",
    capabilities: ["Multi-Route", "Coding", "Tools"],
    locality: "cloud",
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    models: ["qwen2.5-coder:32b", "llama3.3:70b"],
    defaultModel: "qwen2.5-coder:32b",
    capabilities: ["Local", "Coding", "Privacy"],
    locality: "local",
  },
  {
    id: "lmstudio",
    name: "LM Studio (Local)",
    models: ["deepseek-r1-distill-32b", "qwen2.5-14b-instruct"],
    defaultModel: "deepseek-r1-distill-32b",
    capabilities: ["Local", "Reasoning", "Offline Fallback"],
    locality: "local",
  },
];

export const PROJECT_CONTEXTS_SEED: ProjectContextSummary[] = [
  {
    id: "proj-solar-crm",
    name: "SolarGrid AI CRM",
    phase: "design",
    objective: "Deliver responsive MainBrain UI shell, summonable Design Studio tokens, and multi-tenant API contracts.",
    constraints: [
      "Enforce WCAG 2.1 AA contrast across dark OS surfaces",
      "Route all cross-studio handoffs through Jarvis Supervisor",
      "Preserve zero-pill semantic metadata & sandboxed execution",
    ],
    readinessSummary: "Discovery & PRD approved · Design review active",
    activeOwners: ["Jarvis", "Design Agent", "Librarian"],
  },
  {
    id: "proj-cortex-v2",
    name: "CortexOS Core v2",
    phase: "architecture",
    objective: "Harden Provider Failover Router and 6-layer Terminal Context Injection runtime.",
    constraints: [
      "Deterministic capability routing across 8 providers",
      "Local Ollama fallback under cloud outage",
    ],
    readinessSummary: "Provider Service healthy · Studio Runtime live",
    activeOwners: ["Architecture Agent", "Development Agent", "QA Agent"],
  },
  {
    id: "proj-finops-mesh",
    name: "FinOps Treasury Mesh",
    phase: "discovery",
    objective: "Synthesize market landscape and compliance controls for multi-entity treasury orchestration.",
    constraints: [
      "Zero PII leakage in semantic vector index",
      "Immutable audit trail via brain-service outbox",
    ],
    readinessSummary: "Discovery research in progress",
    activeOwners: ["Discovery Agent", "Librarian"],
  },
];

export const DOCK_AGENTS_SEED: DockAgentState[] = [
  {
    id: "jarvis",
    name: "Jarvis",
    role: "Supervisor",
    studioId: "jarvis",
    mission: "Orchestrate cross-studio WorkRequests, quality gates, and phase advancement without direct workspace interference.",
    status: "executing",
    currentTask: "Coordinating Design -> Architecture readiness gate",
    health: 99,
    provider: "anthropic",
    model: "claude-sonnet-4",
    lastArtifact: "Phase Gate Decision #PG-04",
    workload: 74,
    tools: ["work_dispatch", "phase_gate", "council_sync", "audit_trigger"],
    capabilities: ["Routing", "Governance", "Conflict Resolution"],
    updatedAt: "Just now",
  },
  {
    id: "librarian",
    name: "Librarian",
    role: "Knowledge Steward",
    studioId: "librarian",
    mission: "Curate MainBrain memory, ingest verified artifacts, extract entities/concepts, and audit graph contradictions.",
    status: "reviewing",
    currentTask: "Cross-linking WCAG Design Tokens to MainBrain graph",
    health: 98,
    provider: "gemini",
    model: "gemini-2.5-pro",
    lastArtifact: "Wiki Digest: OS Shell Patterns",
    workload: 68,
    tools: ["ingest_source", "extract_entities", "graph_audit", "semantic_link"],
    capabilities: ["Graph Indexing", "Contradiction Audit", "Memory Sync"],
    updatedAt: "1m ago",
  },
  {
    id: "discovery",
    name: "Discovery",
    role: "Research Strategist",
    studioId: "discovery",
    mission: "Map competitive benchmarks, user evidence, and problem-solution assumptions before Product framing.",
    status: "completed",
    currentTask: "Completed competitor OS interaction benchmark",
    health: 97,
    provider: "gemini",
    model: "gemini-2.5-pro",
    lastArtifact: "AI OS UX Signal Report v1.2",
    workload: 28,
    tools: ["web_research", "interview_synth", "opportunity_map"],
    capabilities: ["Market Intel", "Signal Synthesis", "Risk Discovery"],
    updatedAt: "4m ago",
  },
  {
    id: "product",
    name: "Product",
    role: "Product Lead",
    studioId: "product",
    mission: "Distill validated discovery insights into scoped PRDs, acceptance gates, and phased roadmaps.",
    status: "completed",
    currentTask: "Signed off MainBrain + Summonable Studio PRD",
    health: 99,
    provider: "openai",
    model: "gpt-4.1",
    lastArtifact: "PRD: CortexOS Workspace Spec",
    workload: 34,
    tools: ["prd_author", "scope_validator", "criteria_matrix"],
    capabilities: ["PRDs", "Acceptance Criteria", "Prioritization"],
    updatedAt: "3m ago",
  },
  {
    id: "design",
    name: "Design",
    role: "Experience Architect",
    studioId: "design",
    mission: "Translate validated product requirements into accessible user flows, spatial wireframes, and semantic design tokens.",
    status: "executing",
    currentTask: "Auditing WCAG 2.1 AA contrast & summonable drawer grid",
    health: 99,
    provider: "anthropic",
    model: "claude-sonnet-4",
    lastArtifact: "Design System Tokens v1.0",
    workload: 86,
    tools: ["v0", "figma", "magic_patterns", "readdy", "uizard"],
    capabilities: ["User Flows", "Wireframes", "Design System", "WCAG AA"],
    updatedAt: "Just now",
  },
  {
    id: "architecture",
    name: "Architecture",
    role: "Systems Architect",
    studioId: "architecture",
    mission: "Produce resilient OpenAPI contracts, database schemas, service topology, and security threat models.",
    status: "planning",
    currentTask: "Drafting Workspace State Sync & WebSocket topology",
    health: 96,
    provider: "deepseek",
    model: "deepseek-r1",
    lastArtifact: "OpenAPI v3 Service Contracts",
    workload: 58,
    tools: ["mermaid", "erd_builder", "openapi_linter", "threat_model"],
    capabilities: ["OpenAPI", "Database ERD", "Service Mesh"],
    updatedAt: "2m ago",
  },
  {
    id: "development",
    name: "Development",
    role: "Principal Engineer",
    studioId: "development",
    mission: "Implement typed frontend/backend modules against frozen SDK contracts with deterministic test suites.",
    status: "reviewing",
    currentTask: "Verifying AgentDockV2 & WorkspaceManager reducers",
    health: 98,
    provider: "anthropic",
    model: "claude-sonnet-4",
    lastArtifact: "PR #142: Terminal Sandbox Harness",
    workload: 79,
    tools: ["code_gen", "ast_check", "unit_runner", "git_diff"],
    capabilities: ["TypeScript", "FastAPI", "Contract Verification"],
    updatedAt: "Just now",
  },
  {
    id: "qa",
    name: "QA",
    role: "Verification Lead",
    studioId: "qa",
    mission: "Validate end-to-end journeys, keyboard traversal, accessibility compliance, and regression invariance.",
    status: "planning",
    currentTask: "Preparing Playwright verification harness for OS shell",
    health: 95,
    provider: "ollama",
    model: "qwen2.5-coder:32b",
    lastArtifact: "WCAG & Regression Matrix #88",
    workload: 52,
    tools: ["playwright_runner", "a11y_probe", "contract_test"],
    capabilities: ["E2E Flows", "Accessibility Gate", "Regression Audit"],
    updatedAt: "5m ago",
  },
  {
    id: "release",
    name: "Release",
    role: "Release Commander",
    studioId: "release",
    mission: "Coordinate staged rollout checklists, changelog attestations, and telemetry health verification.",
    status: "idle",
    currentTask: "Awaiting QA sign-off for Sprint 4/5 release bundle",
    health: 100,
    provider: "openrouter",
    model: "openrouter/auto",
    lastArtifact: "Release Playbook v2026.11",
    workload: 14,
    tools: ["rollout_gate", "canary_check", "changelog_gen"],
    capabilities: ["Canary Rollout", "Smoke Checks", "Release Notes"],
    updatedAt: "8m ago",
  },
];

export const INITIAL_KNOWLEDGE_FEED: KnowledgeFeedItem[] = [
  {
    id: "kf-1",
    kind: "decision",
    title: "MainBrain Home + Summonable Studio Constitution",
    summary: "Replaced legacy 5-page dashboard tabs with a single MainBrain stream, persistent AgentDockV2, and overlay/pinned Studio Workspaces.",
    projectId: "proj-solar-crm",
    author: "Jarvis Supervisor",
    updatedAt: "2m ago",
    connectionsCount: 14,
  },
  {
    id: "kf-2",
    kind: "pattern",
    title: "6-Layer Context Injection Stack",
    summary: "Every terminal command and studio execution binds User Prompt -> Project -> Artifacts -> Memory -> Knowledge -> Studio Charter.",
    projectId: "proj-cortex-v2",
    author: "Chief Librarian",
    updatedAt: "6m ago",
    connectionsCount: 19,
  },
  {
    id: "kf-3",
    kind: "concept",
    title: "WCAG 2.1 AA Dark Obsidian Contrast Standard",
    summary: "Automated luminance validation enforces >= 4.5:1 text contrast and non-hue state pairing before Design Studio handoff.",
    projectId: "proj-solar-crm",
    author: "Design Agent",
    updatedAt: "9m ago",
    connectionsCount: 8,
  },
  {
    id: "kf-4",
    kind: "wiki",
    title: "Multi-Provider Failover Chain (Cloud -> Local Ollama)",
    summary: "Health-aware capability router preserves execution continuity when primary cloud model providers degrade.",
    projectId: "proj-cortex-v2",
    author: "Chief Librarian",
    updatedAt: "14m ago",
    connectionsCount: 11,
  },
];

export const INITIAL_ARTIFACT_FEED: ArtifactFeedItem[] = [
  {
    id: "art-ds-904a",
    title: "Design System Tokens v1.0",
    artifactType: "design_system",
    studioId: "design",
    status: "approved",
    version: "1.0.0",
    projectId: "proj-solar-crm",
    checksumPrefix: "a91f4c82",
    summary: "Semantic obsidian surface palette, tabular numeral typography scale, and reduced-motion rules verified at 100% WCAG AA.",
    updatedAt: "1m ago",
  },
  {
    id: "art-wf-331b",
    title: "MainBrain + Summonable Drawer Wireframes",
    artifactType: "wireframe",
    studioId: "design",
    status: "review",
    version: "1.1.0",
    projectId: "proj-solar-crm",
    checksumPrefix: "f48201bc",
    summary: "Responsive 12/8/4 spatial grid covering top Agent Dock, central MainBrain stream, pinned right Workspace rail, and Terminal Sandbox.",
    updatedAt: "3m ago",
  },
  {
    id: "art-api-772c",
    title: "Provider & Studio Runtime OpenAPI Spec",
    artifactType: "openapi_spec",
    studioId: "architecture",
    status: "indexed",
    version: "2.0.1",
    projectId: "proj-cortex-v2",
    checksumPrefix: "7e11d904",
    summary: "Unified DTOs and capability routing endpoints across /api/v1/providers and /api/v1/studios.",
    updatedAt: "7m ago",
  },
  {
    id: "art-prd-118d",
    title: "PRD: Autonomous Lead & Design Pipeline",
    artifactType: "prd",
    studioId: "product",
    status: "connected",
    version: "1.3.0",
    projectId: "proj-solar-crm",
    checksumPrefix: "c209e411",
    summary: "Scoped functional boundaries and phase exit criteria linking Discovery signals to Design & Architecture execution.",
    updatedAt: "12m ago",
  },
];

export const INITIAL_ACTIVITY_FEED: AgentActivityEvent[] = [
  {
    id: "act-101",
    agentId: "design",
    agentName: "Design",
    status: "executing",
    task: "Auditing WCAG 2.1 AA contrast & summonable drawer grid",
    summary: "Verified 18.33:1 primary canvas contrast and responsive 1440px drawer layout.",
    artifactTitle: "Design System Tokens v1.0",
    provider: "anthropic · claude-sonnet-4",
    timestamp: "Just now",
  },
  {
    id: "act-102",
    agentId: "jarvis",
    agentName: "Jarvis",
    status: "reviewing",
    task: "Evaluating Design -> Architecture handoff readiness",
    summary: "3 Design artifacts verified; queued architecture review gate.",
    provider: "anthropic · claude-sonnet-4",
    timestamp: "1m ago",
  },
  {
    id: "act-103",
    agentId: "librarian",
    agentName: "Librarian",
    status: "completed",
    task: "Indexed 4 new MainBrain decisions and checksum links",
    summary: "Graph integrity healthy with 0 orphan artifact references.",
    artifactTitle: "Wiki Digest: OS Shell Patterns",
    provider: "gemini · gemini-2.5-pro",
    timestamp: "2m ago",
  },
  {
    id: "act-104",
    agentId: "development",
    agentName: "Development",
    status: "executing",
    task: "Wiring WorkspaceManager Slide-in / Pin / Dock / Focus reducers",
    summary: "State transitions validated with deterministic unit assertions.",
    artifactTitle: "PR #142: Terminal Sandbox Harness",
    provider: "anthropic · claude-sonnet-4",
    timestamp: "3m ago",
  },
];

export const INITIAL_TERMINAL_HISTORY: TerminalTraceEntry[] = [
  {
    id: "term-boot-1",
    timestamp: "Boot",
    command: "@jarvis inspect system readiness --project proj-solar-crm",
    targetAgentId: "jarvis",
    provider: "anthropic",
    model: "claude-sonnet-4",
    contextLayers: [
      "1. User Prompt: System readiness check",
      "2. Project: SolarGrid AI CRM (phase=design)",
      "3. Artifacts: Design System Tokens v1.0, PRD v1.3.0",
      "4. Memory: 4 Design & 3 Jarvis operational rules",
      "5. Knowledge: 6-Layer Context Stack · WCAG AA Standard",
      "6. Studio Charter: Jarvis Supervisor",
    ],
    steps: [
      { phase: "Planning", detail: "Inspecting active WorkRequests across 7 Studios + Librarian." },
      { phase: "Executing", detail: "Aggregating Artifact checksums and Provider health telemetry.", tool: "work_dispatch" },
      { phase: "Reviewing", detail: "Confirming WCAG 2.1 AA gate passed prior to Architecture handoff.", tool: "phase_gate" },
      { phase: "Completed", detail: "MainBrain & Terminal Sandbox online. Ready to summon any agent." },
    ],
    outputSummary: "All 9 Dock agents live. Design Studio active at 100% WCAG AA; Architecture Studio staged for next phase.",
  },
];

export function resolveWorkspaceKind(agentId: DockAgentId): WorkspaceKind {
  if (agentId === "jarvis") return "jarvis";
  if (agentId === "librarian") return "librarian";
  return "studio";
}

export function summonWorkspaceState(
  windows: WorkspaceWindowState[],
  nextZ: number,
  params: {
    id: string;
    agentId: DockAgentId;
    kind: WorkspaceKind;
    title: string;
    subtitle: string;
    mode?: WorkspaceMode;
  }
): WorkspaceWindowState[] {
  const existing = windows.find((w) => w.id === params.id);
  const targetMode: WorkspaceMode = params.mode ?? "drawer";
  if (existing) {
    return windows.map((w) =>
      w.id === params.id
        ? {
            ...w,
            mode: w.mode === "docked" ? (w.pinned ? "pinned" : "drawer") : params.mode ?? w.mode,
            zIndex: nextZ,
          }
        : w
    );
  }
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const created: WorkspaceWindowState = {
    id: params.id,
    agentId: params.agentId,
    kind: params.kind,
    title: params.title,
    subtitle: params.subtitle,
    mode: targetMode,
    pinned: targetMode === "pinned",
    zIndex: nextZ,
    openedAt: now,
  };
  // Keep multiple pinned windows or non-pinned focused/drawer cleanly
  return [...windows, created];
}

export function setWorkspaceModeState(
  windows: WorkspaceWindowState[],
  id: string,
  mode: WorkspaceMode,
  nextZ: number
): WorkspaceWindowState[] {
  return windows.map((w) => {
    if (w.id !== id) {
      // If another workspace enters focused mode, demote other focused windows back to drawer/pinned
      if (mode === "focused" && w.mode === "focused") {
        return { ...w, mode: w.pinned ? "pinned" : "drawer" };
      }
      return w;
    }
    return {
      ...w,
      mode,
      pinned: mode === "pinned" ? true : mode === "docked" ? w.pinned : mode === "drawer" ? false : w.pinned,
      zIndex: nextZ,
    };
  });
}

export function closeWorkspaceState(
  windows: WorkspaceWindowState[],
  id: string
): WorkspaceWindowState[] {
  return windows.filter((w) => w.id !== id);
}

export interface ParsedTerminalCommand {
  kind: "mode" | "agent" | "status";
  targetMode?: OperatingMode;
  targetAgentId: DockAgentId;
  objective: string;
}

const AGENT_MENTION_MAP: Record<string, DockAgentId> = {
  jarvis: "jarvis",
  librarian: "librarian",
  discovery: "discovery",
  product: "product",
  design: "design",
  architecture: "architecture",
  arch: "architecture",
  development: "development",
  dev: "development",
  qa: "qa",
  release: "release",
};

export function parseTerminalCommand(
  rawCommand: string,
  fallbackAgent: DockAgentId = "jarvis"
): ParsedTerminalCommand {
  const trimmed = rawCommand.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "/brain" || lower === "brain mode") {
    return {
      kind: "mode",
      targetMode: "brain",
      targetAgentId: "librarian",
      objective: "Switched viewport to Brain Mode (3D Knowledge Graph).",
    };
  }
  if (lower === "/war-room" || lower === "/warroom" || lower === "war room mode") {
    return {
      kind: "mode",
      targetMode: "warroom",
      targetAgentId: "jarvis",
      objective: "Switched viewport to War Room Mode (Mission Control).",
    };
  }
  if (lower === "/mainbrain" || lower === "/home") {
    return {
      kind: "mode",
      targetMode: "mainbrain",
      targetAgentId: "jarvis",
      objective: "Returned to MainBrain Home stream.",
    };
  }
  if (lower === "/status") {
    return {
      kind: "status",
      targetAgentId: "jarvis",
      objective: "Aggregated real-time status across all 9 CortexOS Dock agents.",
    };
  }

  const mentionMatch = trimmed.match(/^@([a-zA-Z_-]+)\s*(.*)$/);
  if (mentionMatch) {
    const key = mentionMatch[1].toLowerCase();
    const mapped = AGENT_MENTION_MAP[key];
    if (mapped) {
      return {
        kind: "agent",
        targetAgentId: mapped,
        objective: mentionMatch[2].trim() || `Execute active mission objective for ${mapped}`,
      };
    }
  }

  return {
    kind: "agent",
    targetAgentId: fallbackAgent,
    objective: trimmed,
  };
}

const SIMULATION_ROTATION_SEQUENCE: readonly AgentLifecycleStatus[] = [
  "planning",
  "executing",
  "reviewing",
  "completed",
];

const AGENT_SIMULATION_TASKS: Record<DockAgentId, string[]> = {
  jarvis: [
    "Balancing active studio WorkRequests across Mesh",
    "Verifying Design -> Architecture quality gate criteria",
    "Synchronizing approval queue with Owner session",
  ],
  librarian: [
    "Extracting entities from incoming Design Wireframes",
    "Auditing MainBrain edges for duplicate concept drift",
    "Indexing validated Artifact checksums into LLM Wiki",
  ],
  discovery: [
    "Scanning market telemetry for competitive UX patterns",
    "Synthesizing customer friction signals for SolarGrid CRM",
  ],
  product: [
    "Refining acceptance criteria for Sprint 5 workspaces",
    "Validating KPI traceability against Discovery evidence",
  ],
  design: [
    "Auditing WCAG 2.1 AA contrast & summonable drawer grid",
    "Generating responsive 12/8/4 spatial wireframe tokens",
    "Validating keyboard Escape traversal across overlay rails",
  ],
  architecture: [
    "Drafting OpenAPI schemas for Provider Failover Router",
    "Reviewing Postgres graph foreign-key invariants",
  ],
  development: [
    "Compiling TypeScript contracts for StudioRuntime bridge",
    "Executing contract & reducer verification tests",
  ],
  qa: [
    "Validating 1440px viewport invariants via Chromium harness",
    "Asserting role-based permission checks on Studio API",
  ],
  release: [
    "Preparing canary rollout manifest & rollback checks",
    "Verifying health endpoints across ports 8001-8006",
  ],
};

export function nextLifecycleStatus(current: AgentLifecycleStatus): AgentLifecycleStatus {
  const idx = SIMULATION_ROTATION_SEQUENCE.indexOf(current);
  if (idx === -1) return "planning";
  return SIMULATION_ROTATION_SEQUENCE[(idx + 1) % SIMULATION_ROTATION_SEQUENCE.length];
}

export function advanceSimulatedAgentTick(
  agents: DockAgentState[],
  tickCount: number
): {
  nextAgents: DockAgentState[];
  emittedEvent: AgentActivityEvent;
} {
  const targetIndex = tickCount % agents.length;
  const target = agents[targetIndex];
  const nextStatus = nextLifecycleStatus(target.status);
  const taskPool = AGENT_SIMULATION_TASKS[target.id];
  const nextTask =
    nextStatus === "planning"
      ? taskPool[(tickCount + 1) % taskPool.length]
      : target.currentTask;

  const nextWorkload =
    nextStatus === "planning"
      ? 52
      : nextStatus === "executing"
      ? 84
      : nextStatus === "reviewing"
      ? 66
      : 28;

  const updatedAgent: DockAgentState = {
    ...target,
    status: nextStatus,
    currentTask: nextTask,
    workload: nextWorkload,
    updatedAt: "Just now",
  };

  const nextAgents = agents.map((a, i) => (i === targetIndex ? updatedAgent : a));
  const summaryMap: Record<AgentLifecycleStatus, string> = {
    planning: `Scoped execution plan and bound 6-layer Context Stack for "${nextTask}".`,
    executing: `Running specialized tools (${target.tools.slice(0, 2).join(", ")}) against active context.`,
    reviewing: `Validating structural quality gates & schema checksums before completion.`,
    completed: `Completed cycle cleanly; artifact reference synced with MainBrain.`,
    idle: `Standing by for next Jarvis dispatch.`,
    blocked: `Awaiting gate clearance.`,
    failed: `Execution halted on validation error.`,
  };

  const emittedEvent: AgentActivityEvent = {
    id: `act-live-${Date.now()}-${tickCount}`,
    agentId: updatedAgent.id,
    agentName: updatedAgent.name,
    status: nextStatus,
    task: nextTask,
    summary: summaryMap[nextStatus],
    artifactTitle: nextStatus === "completed" ? updatedAgent.lastArtifact : undefined,
    provider: `${updatedAgent.provider} · ${updatedAgent.model}`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };

  return { nextAgents, emittedEvent };
}
