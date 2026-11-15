import type {
  AgentActivityEvent,
  AgentLifecycleStatus,
  ArtifactFeedItem,
  DockAgentId,
  DockAgentState,
  PendingApprovalItem,
  ProjectContextSummary,
  ProviderId,
  RuntimeWorkflowRecord,
  TerminalBrainSyncCompound,
  ToolActivityFeedItem,
} from "../agent-os-logic.ts";
import { PROVIDERS_CATALOG } from "../agent-os-logic.ts";

// ============================================================================
// 1. CONSTITUTIONAL MISSIONS & PROGRESSIVE DISCLOSURE TIERS
// ============================================================================

export type DisclosureLevel = "consumer" | "builder" | "operator";

export type MissionId =
  | "build-software"
  | "launch-product"
  | "research-topics"
  | "create-content"
  | "analyze-knowledge"
  | "run-operations";

export interface MissionDefinition {
  id: MissionId;
  title: string;
  outcomeLabel: string;
  description: string;
  primaryAgents: DockAgentId[];
  defaultPreset: WarRoomPresetId;
  recommendedCommand: string;
}

export const CORTEXOS_MISSIONS: Record<MissionId, MissionDefinition> = {
  "build-software": {
    id: "build-software",
    title: "Build Software",
    outcomeLabel: "Ship verified architecture, code, and tests",
    description:
      "Transform product requirements into OpenAPI contracts, full-stack code, and verified QA gates.",
    primaryAgents: ["jarvis", "architecture", "development", "qa"],
    defaultPreset: "code-and-sandbox",
    recommendedCommand: "@architecture Draft OpenAPI 3.1 service contract and implementation plan",
  },
  "launch-product": {
    id: "launch-product",
    title: "Launch Product",
    outcomeLabel: "Take an idea from discovery to production release",
    description:
      "Coordinate Discovery, Product PRD, Design tokens, and Release readiness playbooks.",
    primaryAgents: ["jarvis", "discovery", "product", "design", "release"],
    defaultPreset: "mission-execution",
    recommendedCommand: "@product Synthesize PRD and milestone acceptance criteria",
  },
  "research-topics": {
    id: "research-topics",
    title: "Research Topics",
    outcomeLabel: "Ingest sources, extract claims, and compound knowledge",
    description:
      "Steward raw research into verified provenance claims, entities, and MainBrain wiki doctrines.",
    primaryAgents: ["librarian", "discovery", "jarvis"],
    defaultPreset: "mission-execution",
    recommendedCommand: "@librarian Extract verbatim provenance claims and link graph entities",
  },
  "create-content": {
    id: "create-content",
    title: "Create Content",
    outcomeLabel: "Produce design systems, wireframes, and technical specs",
    description:
      "Generate WCAG-compliant UI wireframes, design tokens, and canonical documentation artifacts.",
    primaryAgents: ["design", "product", "librarian"],
    defaultPreset: "mission-execution",
    recommendedCommand: "@design Generate WCAG AA wireframe specification and token manifest",
  },
  "analyze-knowledge": {
    id: "analyze-knowledge",
    title: "Analyze Knowledge",
    outcomeLabel: "Audit architecture drift, resolve conflicts, and verify gates",
    description:
      "Run multi-studio Council reviews, 4C knowledge audits, and 2-hop graph dependency analysis.",
    primaryAgents: ["librarian", "jarvis", "architecture", "qa"],
    defaultPreset: "review-and-gates",
    recommendedCommand: "@jarvis Convene multi-studio Council to audit architecture & knowledge drift",
  },
  "run-operations": {
    id: "run-operations",
    title: "Run Operations",
    outcomeLabel: "Supervise runtime queues, provider routing, and telemetry",
    description:
      "Monitor Temporal workflows, execute provider failover drills, and inspect runtime telemetry.",
    primaryAgents: ["jarvis", "release", "qa"],
    defaultPreset: "operator-harness",
    recommendedCommand: "@jarvis Run phase readiness & provider failover verification",
  },
};

// ============================================================================
// 2. FIXED 4-ZONE LAYOUT & 9 CONSTITUTIONAL WAR ROOM PANELS
// ============================================================================

export type DockZoneId = "left" | "center" | "right" | "bottom";

export const DOCK_ZONE_IDS: readonly DockZoneId[] = [
  "left",
  "center",
  "right",
  "bottom",
] as const;

export type WarRoomPanelId =
  | "chat"       // 1. Jarvis Chat Panel
  | "terminal"   // 2. Terminal Panel
  | "sandbox"    // 3. Sandbox Panel
  | "activity"   // 4. Agent Activity Panel
  | "harness"    // 5. Provider Harness Panel
  | "tasks"      // 6. Tasks & Queue Panel
  | "artifacts"  // 7. Artifact Panel
  | "logs"       // 8. Logs & Telemetry Panel
  | "context";   // 9. Knowledge Context Panel

export const WAR_ROOM_PANEL_IDS: readonly WarRoomPanelId[] = [
  "chat",
  "terminal",
  "sandbox",
  "activity",
  "harness",
  "tasks",
  "artifacts",
  "logs",
  "context",
] as const;

export interface WarRoomPanelMeta {
  id: WarRoomPanelId;
  number: number; // 1..9 Constitutional order
  title: string;
  shortTitle: string;
  purpose: string;
  defaultZone: DockZoneId;
  allowedZones: readonly DockZoneId[];
  minDisclosureLevel: DisclosureLevel;
}

export const WAR_ROOM_PANELS: Record<WarRoomPanelId, WarRoomPanelMeta> = {
  chat: {
    id: "chat",
    number: 1,
    title: "01. Jarvis Chat & Council",
    shortTitle: "Jarvis Chat",
    purpose: "Direct supervisor orchestration, studio assignment, and Council consensus.",
    defaultZone: "center",
    allowedZones: ["center", "left", "right"],
    minDisclosureLevel: "consumer",
  },
  terminal: {
    id: "terminal",
    number: 2,
    title: "02. Terminal Console",
    shortTitle: "Terminal",
    purpose: "Direct CLI command execution (@agent, /command) and step-by-step execution trace.",
    defaultZone: "bottom",
    allowedZones: ["bottom", "center", "right"],
    minDisclosureLevel: "builder",
  },
  sandbox: {
    id: "sandbox",
    number: 3,
    title: "03. Studio Sandbox",
    shortTitle: "Sandbox",
    purpose: "Live Studio environment buffers (AGENT.md, mission.md, rules.md) and manifest verification.",
    defaultZone: "center",
    allowedZones: ["center", "right", "left"],
    minDisclosureLevel: "builder",
  },
  activity: {
    id: "activity",
    number: 4,
    title: "04. Agent Activity",
    shortTitle: "Agents",
    purpose: "Real-time Agent Mesh status, active specialist teammates, workload, and health.",
    defaultZone: "right",
    allowedZones: ["right", "left", "bottom"],
    minDisclosureLevel: "consumer",
  },
  harness: {
    id: "harness",
    number: 5,
    title: "05. Provider Harness",
    shortTitle: "Harness",
    purpose: "8-provider model abstraction router, locality controls, and failover execution drills.",
    defaultZone: "left",
    allowedZones: ["left", "right", "bottom"],
    minDisclosureLevel: "operator",
  },
  tasks: {
    id: "tasks",
    number: 6,
    title: "06. Tasks & Queue",
    shortTitle: "Tasks & Queue",
    purpose: "Active WorkRequests, Temporal workflow queues, and lifecycle phase gate approvals.",
    defaultZone: "right",
    allowedZones: ["right", "left", "center", "bottom"],
    minDisclosureLevel: "consumer",
  },
  artifacts: {
    id: "artifacts",
    number: 7,
    title: "07. Artifacts & Gates",
    shortTitle: "Artifacts",
    purpose: "Generated deliverables, SHA-256 checksum inspection, and quality gate sign-off.",
    defaultZone: "center",
    allowedZones: ["center", "right", "left"],
    minDisclosureLevel: "consumer",
  },
  logs: {
    id: "logs",
    number: 8,
    title: "08. Logs & Telemetry",
    shortTitle: "Logs & Cost",
    purpose: "Live tool calls, execution latency, transactional outbox events, and session costs.",
    defaultZone: "bottom",
    allowedZones: ["bottom", "right", "center"],
    minDisclosureLevel: "operator",
  },
  context: {
    id: "context",
    number: 9,
    title: "09. Knowledge Context",
    shortTitle: "Context",
    purpose: "Active 6-Layer Context Stack, MainBrain citations, hybrid search, and source ingestion.",
    defaultZone: "left",
    allowedZones: ["left", "right", "center"],
    minDisclosureLevel: "consumer",
  },
};

// ============================================================================
// 3. CSS-VARIABLE BASED RESIZING & BOUNDS
// ============================================================================

export const WAR_ROOM_CSS_VARS = {
  leftWidth: "--wr-left-w",
  rightWidth: "--wr-right-w",
  bottomHeight: "--wr-bottom-h",
} as const;

export interface ZoneDimensions {
  leftWidthPx: number;
  rightWidthPx: number;
  bottomHeightPx: number;
}

export const ZONE_DIMENSION_BOUNDS = {
  leftWidthPx: { min: 240, max: 520, default: 310, step: 24 },
  rightWidthPx: { min: 260, max: 540, default: 330, step: 24 },
  bottomHeightPx: { min: 160, max: 440, default: 240, step: 24 },
} as const;

export function clampNumber(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function clampZoneDimensions(partial: Partial<ZoneDimensions>, current?: ZoneDimensions): ZoneDimensions {
  const base = current ?? {
    leftWidthPx: ZONE_DIMENSION_BOUNDS.leftWidthPx.default,
    rightWidthPx: ZONE_DIMENSION_BOUNDS.rightWidthPx.default,
    bottomHeightPx: ZONE_DIMENSION_BOUNDS.bottomHeightPx.default,
  };

  return {
    leftWidthPx: clampNumber(
      partial.leftWidthPx ?? base.leftWidthPx,
      ZONE_DIMENSION_BOUNDS.leftWidthPx.min,
      ZONE_DIMENSION_BOUNDS.leftWidthPx.max
    ),
    rightWidthPx: clampNumber(
      partial.rightWidthPx ?? base.rightWidthPx,
      ZONE_DIMENSION_BOUNDS.rightWidthPx.min,
      ZONE_DIMENSION_BOUNDS.rightWidthPx.max
    ),
    bottomHeightPx: clampNumber(
      partial.bottomHeightPx ?? base.bottomHeightPx,
      ZONE_DIMENSION_BOUNDS.bottomHeightPx.min,
      ZONE_DIMENSION_BOUNDS.bottomHeightPx.max
    ),
  };
}

export function buildWarRoomGridCssVars(dimensions: ZoneDimensions): Record<string, string> {
  const clamped = clampZoneDimensions(dimensions);
  return {
    [WAR_ROOM_CSS_VARS.leftWidth]: `${clamped.leftWidthPx}px`,
    [WAR_ROOM_CSS_VARS.rightWidth]: `${clamped.rightWidthPx}px`,
    [WAR_ROOM_CSS_VARS.bottomHeight]: `${clamped.bottomHeightPx}px`,
  };
}

// ============================================================================
// 4. WORKSPACE PRESETS (DETERMINISTIC 4-ZONE CONFIGURATIONS)
// ============================================================================

export type WarRoomPresetId =
  | "mission-execution"
  | "code-and-sandbox"
  | "review-and-gates"
  | "operator-harness";

export interface DockZoneState {
  zoneId: DockZoneId;
  panelIds: WarRoomPanelId[];
  activePanelId: WarRoomPanelId | null;
  collapsed: boolean;
}

export interface WarRoomLayoutState {
  version: 1;
  activePresetId: WarRoomPresetId;
  zones: Record<DockZoneId, DockZoneState>;
  hiddenPanelIds: WarRoomPanelId[];
  maximizedPanelId: WarRoomPanelId | null;
  dimensions: ZoneDimensions;
}

export interface WarRoomPresetMeta {
  id: WarRoomPresetId;
  label: string;
  description: string;
  recommendedTier: DisclosureLevel;
  createLayout: (currentDimensions?: ZoneDimensions) => WarRoomLayoutState;
}

export const WAR_ROOM_PRESETS: Record<WarRoomPresetId, WarRoomPresetMeta> = {
  "mission-execution": {
    id: "mission-execution",
    label: "Mission Execution",
    description: "Balanced workspace for directing Jarvis, reviewing artifacts, and tracking active teammates.",
    recommendedTier: "consumer",
    createLayout: (dims) => ({
      version: 1,
      activePresetId: "mission-execution",
      zones: {
        left: {
          zoneId: "left",
          panelIds: ["context", "harness"],
          activePanelId: "context",
          collapsed: false,
        },
        center: {
          zoneId: "center",
          panelIds: ["chat", "artifacts", "sandbox"],
          activePanelId: "chat",
          collapsed: false,
        },
        right: {
          zoneId: "right",
          panelIds: ["activity", "tasks"],
          activePanelId: "activity",
          collapsed: false,
        },
        bottom: {
          zoneId: "bottom",
          panelIds: ["terminal", "logs"],
          activePanelId: "terminal",
          collapsed: false,
        },
      },
      hiddenPanelIds: [],
      maximizedPanelId: null,
      dimensions: clampZoneDimensions(dims ?? {}),
    }),
  },
  "code-and-sandbox": {
    id: "code-and-sandbox",
    label: "Code & Sandbox",
    description: "Prioritizes the Studio Sandbox workbench, Terminal CLI, and active Tasks queue.",
    recommendedTier: "builder",
    createLayout: (dims) => ({
      version: 1,
      activePresetId: "code-and-sandbox",
      zones: {
        left: {
          zoneId: "left",
          panelIds: ["context", "harness"],
          activePanelId: "context",
          collapsed: false,
        },
        center: {
          zoneId: "center",
          panelIds: ["sandbox", "artifacts", "chat"],
          activePanelId: "sandbox",
          collapsed: false,
        },
        right: {
          zoneId: "right",
          panelIds: ["tasks", "activity"],
          activePanelId: "tasks",
          collapsed: false,
        },
        bottom: {
          zoneId: "bottom",
          panelIds: ["terminal", "logs"],
          activePanelId: "terminal",
          collapsed: false,
        },
      },
      hiddenPanelIds: [],
      maximizedPanelId: null,
      dimensions: clampZoneDimensions(
        dims ?? { leftWidthPx: 280, rightWidthPx: 320, bottomHeightPx: 270 }
      ),
    }),
  },
  "review-and-gates": {
    id: "review-and-gates",
    label: "Review & Gates",
    description: "Focuses on Deliverable SHA-256 verification, Lifecycle Gate approvals, and Audit telemetry.",
    recommendedTier: "builder",
    createLayout: (dims) => ({
      version: 1,
      activePresetId: "review-and-gates",
      zones: {
        left: {
          zoneId: "left",
          panelIds: ["context", "harness"],
          activePanelId: "context",
          collapsed: false,
        },
        center: {
          zoneId: "center",
          panelIds: ["artifacts", "chat", "sandbox"],
          activePanelId: "artifacts",
          collapsed: false,
        },
        right: {
          zoneId: "right",
          panelIds: ["tasks", "activity"],
          activePanelId: "tasks",
          collapsed: false,
        },
        bottom: {
          zoneId: "bottom",
          panelIds: ["logs", "terminal"],
          activePanelId: "logs",
          collapsed: false,
        },
      },
      hiddenPanelIds: [],
      maximizedPanelId: null,
      dimensions: clampZoneDimensions(dims ?? {}),
    }),
  },
  "operator-harness": {
    id: "operator-harness",
    label: "Operator Harness",
    description: "Full 9-panel operator telemetry: Provider Harness, Terminal CLI, Outbox Logs, and Agent Mesh.",
    recommendedTier: "operator",
    createLayout: (dims) => ({
      version: 1,
      activePresetId: "operator-harness",
      zones: {
        left: {
          zoneId: "left",
          panelIds: ["harness", "context"],
          activePanelId: "harness",
          collapsed: false,
        },
        center: {
          zoneId: "center",
          panelIds: ["chat", "sandbox", "artifacts"],
          activePanelId: "chat",
          collapsed: false,
        },
        right: {
          zoneId: "right",
          panelIds: ["activity", "tasks"],
          activePanelId: "activity",
          collapsed: false,
        },
        bottom: {
          zoneId: "bottom",
          panelIds: ["logs", "terminal"],
          activePanelId: "logs",
          collapsed: false,
        },
      },
      hiddenPanelIds: [],
      maximizedPanelId: null,
      dimensions: clampZoneDimensions(
        dims ?? { leftWidthPx: 320, rightWidthPx: 350, bottomHeightPx: 280 }
      ),
    }),
  },
};

// ============================================================================
// 5. DETERMINISTIC PANEL PLACEMENT & LAYOUT TRANSITION FUNCTIONS
// ============================================================================

export const WAR_ROOM_STORAGE_KEY = "cortexos.warroom.layout.v1";

export function createDefaultWarRoomLayout(
  presetId: WarRoomPresetId = "mission-execution"
): WarRoomLayoutState {
  const preset = WAR_ROOM_PRESETS[presetId] ?? WAR_ROOM_PRESETS["mission-execution"];
  return preset.createLayout();
}

export function findPanelZone(
  layout: WarRoomLayoutState,
  panelId: WarRoomPanelId
): DockZoneId {
  for (const zoneId of DOCK_ZONE_IDS) {
    if (layout.zones[zoneId].panelIds.includes(panelId)) {
      return zoneId;
    }
  }
  return WAR_ROOM_PANELS[panelId].defaultZone;
}

export function isWarRoomPanelVisible(
  layout: WarRoomLayoutState,
  panelId: WarRoomPanelId
): boolean {
  if (layout.hiddenPanelIds.includes(panelId)) return false;
  const zoneId = findPanelZone(layout, panelId);
  return !layout.zones[zoneId].collapsed;
}

export function isZoneAllowedForPanel(
  panelId: WarRoomPanelId,
  targetZoneId: DockZoneId
): boolean {
  const meta = WAR_ROOM_PANELS[panelId];
  if (!meta) return false;
  return meta.allowedZones.includes(targetZoneId);
}

export function getAllowedTargetZonesForPanel(
  panelId: WarRoomPanelId
): readonly DockZoneId[] {
  return WAR_ROOM_PANELS[panelId]?.allowedZones ?? DOCK_ZONE_IDS;
}

export function stepWarRoomZoneDimension(
  dimensions: ZoneDimensions,
  zoneId: Exclude<DockZoneId, "center">,
  stepDirection: 1 | -1 | "min" | "max"
): ZoneDimensions {
  const clamped = clampZoneDimensions(dimensions);
  if (zoneId === "left") {
    const nextVal =
      stepDirection === "min"
        ? ZONE_DIMENSION_BOUNDS.leftWidthPx.min
        : stepDirection === "max"
          ? ZONE_DIMENSION_BOUNDS.leftWidthPx.max
          : clamped.leftWidthPx + stepDirection * ZONE_DIMENSION_BOUNDS.leftWidthPx.step;
    return clampZoneDimensions({ leftWidthPx: nextVal }, clamped);
  }
  if (zoneId === "right") {
    const nextVal =
      stepDirection === "min"
        ? ZONE_DIMENSION_BOUNDS.rightWidthPx.min
        : stepDirection === "max"
          ? ZONE_DIMENSION_BOUNDS.rightWidthPx.max
          : clamped.rightWidthPx + stepDirection * ZONE_DIMENSION_BOUNDS.rightWidthPx.step;
    return clampZoneDimensions({ rightWidthPx: nextVal }, clamped);
  }
  const nextVal =
    stepDirection === "min"
      ? ZONE_DIMENSION_BOUNDS.bottomHeightPx.min
      : stepDirection === "max"
        ? ZONE_DIMENSION_BOUNDS.bottomHeightPx.max
        : clamped.bottomHeightPx + stepDirection * ZONE_DIMENSION_BOUNDS.bottomHeightPx.step;
  return clampZoneDimensions({ bottomHeightPx: nextVal }, clamped);
}

/**
 * Deterministically activates a panel in its current zone, unhiding it and
 * expanding its zone if collapsed.
 */
export function activateWarRoomPanel(
  layout: WarRoomLayoutState,
  panelId: WarRoomPanelId
): WarRoomLayoutState {
  const zoneId = findPanelZone(layout, panelId);
  const zone = layout.zones[zoneId];
  const nextPanelIds = zone.panelIds.includes(panelId)
    ? zone.panelIds
    : [...zone.panelIds, panelId];

  return {
    ...layout,
    hiddenPanelIds: layout.hiddenPanelIds.filter((id) => id !== panelId),
    zones: {
      ...layout.zones,
      [zoneId]: {
        ...zone,
        panelIds: nextPanelIds,
        activePanelId: panelId,
        collapsed: false,
      },
    },
  };
}

/**
 * Deterministically moves a panel to a target fixed zone (left, center, right, bottom)
 * without drag-and-drop. Enforces `allowedZones` metadata at the state level and
 * guarantees that `center` never becomes completely empty.
 */
export function moveWarRoomPanelToZone(
  layout: WarRoomLayoutState,
  panelId: WarRoomPanelId,
  targetZoneId: DockZoneId
): WarRoomLayoutState {
  // Enforce allowedZones metadata at the state transition level
  if (!isZoneAllowedForPanel(panelId, targetZoneId)) {
    return layout;
  }

  const sourceZoneId = findPanelZone(layout, panelId);
  if (sourceZoneId === targetZoneId) {
    return activateWarRoomPanel(layout, panelId);
  }

  const sourceZone = layout.zones[sourceZoneId];
  // Prevent emptying the center primary stage completely
  if (sourceZoneId === "center" && sourceZone.panelIds.length <= 1) {
    return activateWarRoomPanel(layout, panelId);
  }

  const nextSourcePanels = sourceZone.panelIds.filter((id) => id !== panelId);
  const nextSourceActive =
    sourceZone.activePanelId === panelId
      ? nextSourcePanels[0] ?? null
      : sourceZone.activePanelId;

  const targetZone = layout.zones[targetZoneId];
  const nextTargetPanels = targetZone.panelIds.includes(panelId)
    ? targetZone.panelIds
    : [...targetZone.panelIds, panelId];

  return {
    ...layout,
    hiddenPanelIds: layout.hiddenPanelIds.filter((id) => id !== panelId),
    zones: {
      ...layout.zones,
      [sourceZoneId]: {
        ...sourceZone,
        panelIds: nextSourcePanels,
        activePanelId: nextSourceActive,
        collapsed: nextSourcePanels.length === 0 ? true : sourceZone.collapsed,
      },
      [targetZoneId]: {
        ...targetZone,
        panelIds: nextTargetPanels,
        activePanelId: panelId,
        collapsed: false,
      },
    },
  };
}

/**
 * Toggles a panel's visibility. If the panel is currently the active tab in an
 * expanded zone, hiding it switches to the next available tab or collapses the zone
 * (except `center`, which always retains at least one visible panel).
 */
export function toggleWarRoomPanelVisibility(
  layout: WarRoomLayoutState,
  panelId: WarRoomPanelId
): WarRoomLayoutState {
  const zoneId = findPanelZone(layout, panelId);
  const zone = layout.zones[zoneId];
  const isCurrentlyHidden = layout.hiddenPanelIds.includes(panelId) || zone.collapsed;

  if (isCurrentlyHidden) {
    return activateWarRoomPanel(layout, panelId);
  }

  const visibleInZone = zone.panelIds.filter(
    (id) => id !== panelId && !layout.hiddenPanelIds.includes(id)
  );

  // Never allow hiding the final visible panel in the center stage
  if (zoneId === "center" && visibleInZone.length === 0) {
    return layout;
  }

  const nextHidden = Array.from(new Set([...layout.hiddenPanelIds, panelId]));
  const nextActive =
    zone.activePanelId === panelId
      ? visibleInZone[0] ?? zone.panelIds[0] ?? null
      : zone.activePanelId;

  return {
    ...layout,
    maximizedPanelId: layout.maximizedPanelId === panelId ? null : layout.maximizedPanelId,
    hiddenPanelIds: nextHidden,
    zones: {
      ...layout.zones,
      [zoneId]: {
        ...zone,
        activePanelId: nextActive,
        collapsed: visibleInZone.length === 0 ? true : zone.collapsed,
      },
    },
  };
}

export function toggleWarRoomZoneCollapsed(
  layout: WarRoomLayoutState,
  zoneId: DockZoneId
): WarRoomLayoutState {
  // Center zone cannot be collapsed
  if (zoneId === "center") return layout;
  const zone = layout.zones[zoneId];
  const nextCollapsed = !zone.collapsed;

  return {
    ...layout,
    zones: {
      ...layout.zones,
      [zoneId]: {
        ...zone,
        collapsed: nextCollapsed,
      },
    },
  };
}

export function setWarRoomMaximizedPanel(
  layout: WarRoomLayoutState,
  panelId: WarRoomPanelId | null
): WarRoomLayoutState {
  if (panelId === null) {
    return { ...layout, maximizedPanelId: null };
  }
  const activated = activateWarRoomPanel(layout, panelId);
  return {
    ...activated,
    maximizedPanelId: layout.maximizedPanelId === panelId ? null : panelId,
  };
}

export function serializeWarRoomLayout(layout: WarRoomLayoutState): string {
  return JSON.stringify(layout);
}

export function deserializeWarRoomLayout(raw: string | null | undefined): WarRoomLayoutState {
  if (!raw) return createDefaultWarRoomLayout("mission-execution");
  try {
    const parsed = JSON.parse(raw) as Partial<WarRoomLayoutState>;
    if (!parsed || parsed.version !== 1 || !parsed.zones) {
      return createDefaultWarRoomLayout("mission-execution");
    }
    const presetId: WarRoomPresetId =
      parsed.activePresetId && parsed.activePresetId in WAR_ROOM_PRESETS
        ? parsed.activePresetId
        : "mission-execution";
    const base = createDefaultWarRoomLayout(presetId);

    const assignedPanels = new Set<WarRoomPanelId>();
    const validatedZones: Record<DockZoneId, DockZoneState> = { ...base.zones };

    for (const zoneId of DOCK_ZONE_IDS) {
      const candidate = parsed.zones[zoneId];
      if (candidate && Array.isArray(candidate.panelIds)) {
        const validPanels = candidate.panelIds.filter(
          (id): id is WarRoomPanelId =>
            WAR_ROOM_PANEL_IDS.includes(id) &&
            isZoneAllowedForPanel(id, zoneId) &&
            !assignedPanels.has(id)
        );
        if (validPanels.length > 0) {
          validPanels.forEach((id) => assignedPanels.add(id));
          validatedZones[zoneId] = {
            zoneId,
            panelIds: validPanels,
            activePanelId:
              candidate.activePanelId && validPanels.includes(candidate.activePanelId)
                ? candidate.activePanelId
                : validPanels[0],
            collapsed: zoneId === "center" ? false : Boolean(candidate.collapsed),
          };
        }
      }
    }

    // Self-heal any unassigned panel back into its defaultZone
    for (const panelId of WAR_ROOM_PANEL_IDS) {
      const alreadyPresent = DOCK_ZONE_IDS.some((zId) =>
        validatedZones[zId].panelIds.includes(panelId)
      );
      if (!alreadyPresent) {
        const defaultZone = WAR_ROOM_PANELS[panelId].defaultZone;
        const zone = validatedZones[defaultZone];
        const nextPanels = [...zone.panelIds, panelId];
        validatedZones[defaultZone] = {
          ...zone,
          panelIds: nextPanels,
          activePanelId: zone.activePanelId ?? nextPanels[0],
        };
      }
    }

    const validHidden = Array.isArray(parsed.hiddenPanelIds)
      ? parsed.hiddenPanelIds.filter((id): id is WarRoomPanelId =>
          WAR_ROOM_PANEL_IDS.includes(id)
        )
      : [];

    const validMaximized =
      parsed.maximizedPanelId && WAR_ROOM_PANEL_IDS.includes(parsed.maximizedPanelId)
        ? parsed.maximizedPanelId
        : null;

    return {
      version: 1,
      activePresetId: presetId,
      zones: validatedZones,
      hiddenPanelIds: validHidden,
      maximizedPanelId: validMaximized,
      dimensions: clampZoneDimensions(parsed.dimensions ?? base.dimensions),
    };
  } catch {
    return createDefaultWarRoomLayout("mission-execution");
  }
}

// ============================================================================
// 6. WAR ROOM GOLDEN RULE (5-SECOND CLARITY TELEMETRY SELECTOR)
// ============================================================================

/**
 * Answers the 6 Constitutional War Room Golden Rule questions within 5 seconds:
 * 1. What am I trying to accomplish?
 * 2. What is currently running?
 * 3. Which agent is working?
 * 4. Which model is being used?
 * 5. What happened?
 * 6. What should I do next?
 */
export interface WarRoomGoldenRuleSnapshot {
  // 1. What am I trying to accomplish?
  activeMissionId: MissionId;
  activeMissionTitle: string;
  missionObjective: string;
  projectName: string;
  currentPhase: string;

  // 2. What is currently running?
  isExecuting: boolean;
  executionState: AgentLifecycleStatus;
  activeWorkflowType: string;
  activeTaskSummary: string;
  activeToolCall: string;

  // 3. Which agent is working?
  activeAgentId: DockAgentId;
  activeAgentName: string;
  activeAgentRole: string;
  activeAgentHealth: number;
  activeAgentsCount: number;

  // 4. Which model is being used?
  activeProviderId: ProviderId;
  activeProviderName: string;
  activeModel: string;
  providerLocality: "cloud" | "local";

  // 5. What happened?
  whatHappenedSummary: string;
  latestArtifactTitle: string;
  latestDecisionTitle: string;
  totalToolRuns: number;
  estimatedTokens: number;
  estimatedSessionCostUsd: number;

  // 6. What should I do next?
  nextStepLabel: string;
  nextStepReason: string;
  nextStepTargetPanel: WarRoomPanelId;
  nextStepCommand: string;
}

const PROVIDER_COST_PER_1K_TOKENS: Record<ProviderId, number> = {
  openai: 0.005,
  anthropic: 0.006,
  gemini: 0.0015,
  grok: 0.004,
  deepseek: 0.0008,
  openrouter: 0.003,
  ollama: 0.0,
  lmstudio: 0.0,
};

export function deriveWarRoomGoldenRuleTelemetry(params: {
  activeMission: MissionId;
  activeProject: ProjectContextSummary;
  agents: DockAgentState[];
  selectedProvider: ProviderId;
  selectedModel: string;
  isExecutingCommand: boolean;
  workflows: RuntimeWorkflowRecord[];
  toolActivityFeed: ToolActivityFeedItem[];
  artifactFeed: ArtifactFeedItem[];
  activityFeed: AgentActivityEvent[];
  pendingApprovals: PendingApprovalItem[];
  latestTerminalCompound: TerminalBrainSyncCompound | null;
}): WarRoomGoldenRuleSnapshot {
  const missionDef =
    CORTEXOS_MISSIONS[params.activeMission] ?? CORTEXOS_MISSIONS["build-software"];

  const executingAgent =
    params.agents.find((a) => a.status === "executing") ??
    params.agents.find((a) => a.status === "planning" || a.status === "reviewing") ??
    params.agents.find((a) => a.id === params.activeProject.phase) ??
    params.agents[0];

  const activeAgentsCount = params.agents.filter((a) => a.status !== "idle").length;

  const providerMeta =
    PROVIDERS_CATALOG.find((p) => p.id === params.selectedProvider) ?? PROVIDERS_CATALOG[0];

  const runningWorkflow =
    params.workflows.find((w) => w.status === "running" || w.status === "waiting_approval") ??
    params.workflows[0];

  const latestTool = params.toolActivityFeed[0];
  const latestArtifact = params.artifactFeed[0];
  const latestActivity = params.activityFeed[0];

  const totalToolRuns = params.toolActivityFeed.length;
  const estimatedTokens = totalToolRuns * 1450 + params.workflows.length * 820;
  const ratePer1k = PROVIDER_COST_PER_1K_TOKENS[params.selectedProvider] ?? 0.003;
  const estimatedSessionCostUsd = Number(((estimatedTokens / 1000) * ratePer1k).toFixed(4));

  const whatHappenedSummary = params.latestTerminalCompound
    ? `${params.latestTerminalCompound.agentName} ran ${params.latestTerminalCompound.toolName} (${params.latestTerminalCompound.durationMs}ms) → produced "${params.latestTerminalCompound.artifactTitle}"`
    : latestTool
    ? `${latestTool.agentName} executed ${latestTool.toolName} (${latestTool.executionTimeMs}ms) → ${latestTool.artifactProduced}`
    : latestActivity
    ? `${latestActivity.agentName}: ${latestActivity.summary}`
    : "MainBrain context synchronized and ready for execution.";

  // Determine Question #6: "What should I do next?"
  let nextStepLabel = `Dispatch ${missionDef.title} Directive`;
  let nextStepReason = `Execute the next ${params.activeProject.phase} milestone via Jarvis Supervisor.`;
  let nextStepTargetPanel: WarRoomPanelId = "chat";
  let nextStepCommand = missionDef.recommendedCommand;

  if (params.pendingApprovals.length > 0) {
    const firstApproval = params.pendingApprovals[0];
    nextStepLabel = `Review & Approve Gate: ${firstApproval.title}`;
    nextStepReason = `${firstApproval.requestedBy} is waiting on human sign-off to unlock the next phase.`;
    nextStepTargetPanel = "artifacts";
    nextStepCommand = `@jarvis Verify quality gate for "${firstApproval.title}"`;
  } else if (executingAgent && executingAgent.status === "blocked") {
    nextStepLabel = `Unblock ${executingAgent.name}`;
    nextStepReason = `${executingAgent.name} reported a blocker on "${executingAgent.currentTask}".`;
    nextStepTargetPanel = "tasks";
    nextStepCommand = `@jarvis Resolve blocker for ${executingAgent.id}`;
  } else if (latestArtifact && latestArtifact.status === "review") {
    nextStepLabel = `Approve Deliverable: ${latestArtifact.title}`;
    nextStepReason = `Deliverable checksum #${latestArtifact.checksumPrefix} is ready for gate verification.`;
    nextStepTargetPanel = "artifacts";
    nextStepCommand = `@qa Audit artifact "${latestArtifact.title}"`;
  }

  return {
    activeMissionId: missionDef.id,
    activeMissionTitle: missionDef.title,
    missionObjective: params.activeProject.objective || missionDef.description,
    projectName: params.activeProject.name,
    currentPhase: params.activeProject.phase,

    isExecuting: params.isExecutingCommand || executingAgent?.status === "executing",
    executionState: params.isExecutingCommand
      ? "executing"
      : executingAgent?.status ?? "idle",
    activeWorkflowType: runningWorkflow?.workflowType ?? executingAgent?.currentWorkflow ?? "WorkRequestWorkflow",
    activeTaskSummary:
      runningWorkflow?.currentStep ?? executingAgent?.currentTask ?? "Awaiting directive",
    activeToolCall: latestTool?.toolName ?? executingAgent?.tools[0] ?? "jarvis.orchestrate",

    activeAgentId: executingAgent?.id ?? "jarvis",
    activeAgentName: executingAgent?.name ?? "Jarvis",
    activeAgentRole: executingAgent?.role ?? "Operating System Supervisor",
    activeAgentHealth: executingAgent?.health ?? 100,
    activeAgentsCount,

    activeProviderId: params.selectedProvider,
    activeProviderName: providerMeta.name,
    activeModel: params.selectedModel,
    providerLocality: providerMeta.locality,

    whatHappenedSummary,
    latestArtifactTitle:
      params.latestTerminalCompound?.artifactTitle ??
      latestArtifact?.title ??
      "None emitted yet",
    latestDecisionTitle:
      params.latestTerminalCompound?.decisionTitle ??
      executingAgent?.lastDecision ??
      "Enforce Constitutional Gate",
    totalToolRuns,
    estimatedTokens,
    estimatedSessionCostUsd,

    nextStepLabel,
    nextStepReason,
    nextStepTargetPanel,
    nextStepCommand,
  };
}
