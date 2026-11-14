import { createHash } from "node:crypto";
import type { Artifact, WorkRequest } from "../../../packages/shared-types/src/index.ts";
import type { ColorTokenPair } from "./accessibility.ts";

export interface DesignTokenPalette {
  surfaceCanvas: string;
  surfaceElevated: string;
  surfaceRecessed: string;
  inkPrimary: string;
  inkSecondary: string;
  accentPrimary: string;
  inkOnAccent: string;
  borderSubtle: string;
  borderFocus: string;
}

export interface GeneratedDesignArtifact {
  artifact: Artifact;
  content: string;
}

export const DEFAULT_DESIGN_PALETTE: DesignTokenPalette = {
  surfaceCanvas: "#0B0F17",
  surfaceElevated: "#121826",
  surfaceRecessed: "#070A10",
  inkPrimary: "#F8FAFC",
  inkSecondary: "#CBD5E1",
  accentPrimary: "#38BDF8",
  inkOnAccent: "#082F49",
  borderSubtle: "#1E293B",
  borderFocus: "#7DD3FC",
};

export function paletteToContrastPairs(palette: DesignTokenPalette): ColorTokenPair[] {
  return [
    {
      name: "primary_ink_on_canvas",
      foreground: palette.inkPrimary,
      background: palette.surfaceCanvas,
    },
    {
      name: "secondary_ink_on_elevated",
      foreground: palette.inkSecondary,
      background: palette.surfaceElevated,
    },
    {
      name: "ink_on_accent",
      foreground: palette.inkOnAccent,
      background: palette.accentPrimary,
    },
    {
      name: "focus_ring_on_canvas",
      foreground: palette.borderFocus,
      background: palette.surfaceCanvas,
      isLargeTextOrUi: true,
    },
  ];
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function deterministicId(prefix: string, seed: string): string {
  const hash = sha256(`${prefix}:${seed}`).slice(0, 12);
  return `${prefix}-${hash}`;
}

export function buildUserFlowArtifact(
  request: WorkRequest,
  nowIso: string
): GeneratedDesignArtifact {
  const content = [
    `# User Flows & Interaction Architecture — ${request.objective}`,
    "",
    `- Project ID: \`${request.projectId}\``,
    `- Work Request ID: \`${request.id}\``,
    `- Studio: \`design\``,
    "",
    "## 1. Entry & Summoning Flow",
    "1. User enters MainBrain Surface with persistent top-center Agent Dock.",
    "2. User triggers objective via Terminal Sandbox command or Agent Dock summons.",
    "3. Workspace panel slides in without leaving the primary MainBrain spatial context.",
    "",
    "## 2. Primary Interactive State Machine",
    "- `idle` -> `loading` (optimistic intent feedback + `aria-live=\"polite\"`) -> `ready`",
    "- `ready` -> `empty` (clear call-to-action to seed or ingest source context)",
    "- `loading` -> `error` (recoverable retry banner + diagnostic reference)",
    "",
    "## 3. Applied Constraints",
    ...(request.constraints.length > 0
      ? request.constraints.map((c) => `- ${c}`)
      : ["- Maintain keyboard focus order, Escape dismissal, and state persistence."]),
    "",
    "## 4. Success Criteria Coverage",
    ...(request.successCriteria.length > 0
      ? request.successCriteria.map((s) => `- [x] ${s}`)
      : ["- [x] End-to-end user transitions mapped with recoverable states."]),
  ].join("\n");

  const checksum = sha256(content);
  const artifact: Artifact = {
    id: deterministicId("art-flow", `${request.projectId}:${request.id}`),
    organizationId:
      request.organizationId ?? "00000000-0000-0000-0000-000000000001",
    projectId: request.projectId,
    title: `User Flows: ${request.objective.slice(0, 64)}`,
    artifactType: "ui_design",
    status: "review",
    version: "1.0.0",
    summary: `End-to-end user journeys, interaction state transitions, and recovery flows for "${request.objective}".`,
    contentUri: `cortex://artifacts/design/${request.projectId}/user-flows-${request.id}.md`,
    checksum,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: "design-agent",
    tags: ["design", "user-flows", "interaction-spec"],
    metadata: {
      workRequestId: request.id,
      activity: "FlowDesign",
      statesCovered: ["idle", "loading", "empty", "ready", "error"],
      toolsReferenced: ["readdy", "magic_patterns"],
    },
  };

  return { artifact, content };
}

export function buildWireframeArtifact(
  request: WorkRequest,
  nowIso: string
): GeneratedDesignArtifact {
  const content = [
    `# Spatial Wireframe Specification — ${request.objective}`,
    "",
    `- Project ID: \`${request.projectId}\``,
    `- Work Request ID: \`${request.id}\``,
    `- Grid System: 12-col desktop (>=1280px) / 8-col tablet (>=768px) / 4-col mobile (<768px)`,
    "",
    "## 1. Layout Landmarks",
    "- `<header role=\"banner\">`: Persistent Agent Dock status strip & project phase indicator.",
    "- `<main>`: Primary MainBrain & Terminal Sandbox focal canvas (>=72% viewport).",
    "- `<aside role=\"complementary\">`: Summonable Context & Artifact Inspector drawer (dismisses on `Escape`).",
    "",
    "## 2. Keyboard & Focus Order",
    "1. Skip-to-main link (`Tab` #1)",
    "2. Agent Dock summon controls (`Tab` / Arrow navigation)",
    "3. Primary Workspace action & Terminal prompt input",
    "4. Slide-over drawer close (`Escape` restores focus to trigger)",
    "",
    "## 3. Viewports & Component States",
    "- **Populated**: Structured hierarchy with clear spacing rhythm (`4px` grid).",
    "- **Loading**: Skeleton placeholders preserving layout geometry (zero CLS).",
    "- **Empty**: Actionable zero-state guidance with primary CTA.",
    "- **Error**: Inline non-blocking alert with retry action.",
  ].join("\n");

  const checksum = sha256(content);
  const artifact: Artifact = {
    id: deterministicId("art-wireframe", `${request.projectId}:${request.id}`),
    organizationId:
      request.organizationId ?? "00000000-0000-0000-0000-000000000001",
    projectId: request.projectId,
    title: `Wireframe Spec: ${request.objective.slice(0, 64)}`,
    artifactType: "wireframe",
    status: "review",
    version: "1.0.0",
    summary: `Responsive spatial wireframes, ARIA landmark topology, and keyboard focus plan for "${request.objective}".`,
    contentUri: `cortex://artifacts/design/${request.projectId}/wireframe-${request.id}.md`,
    checksum,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: "design-agent",
    tags: ["design", "wireframe", "responsive-layout"],
    metadata: {
      workRequestId: request.id,
      activity: "WireframeGeneration",
      hasPrimaryMainLandmark: true,
      hasKeyboardTraversalPlan: true,
      hasLoadingEmptyErrorStates: true,
      toolsReferenced: ["uizard", "figma"],
    },
  };

  return { artifact, content };
}

export function buildDesignSystemArtifact(
  request: WorkRequest,
  palette: DesignTokenPalette,
  nowIso: string
): GeneratedDesignArtifact {
  const content = [
    `# Design System & Token Specification — ${request.objective}`,
    "",
    `- Project ID: \`${request.projectId}\``,
    `- Work Request ID: \`${request.id}\``,
    "",
    "## 1. Semantic CSS Tokens",
    "```css",
    ":root {",
    `  --cx-surface-canvas: ${palette.surfaceCanvas};`,
    `  --cx-surface-elevated: ${palette.surfaceElevated};`,
    `  --cx-surface-recessed: ${palette.surfaceRecessed};`,
    `  --cx-ink-primary: ${palette.inkPrimary};`,
    `  --cx-ink-secondary: ${palette.inkSecondary};`,
    `  --cx-accent-primary: ${palette.accentPrimary};`,
    `  --cx-ink-on-accent: ${palette.inkOnAccent};`,
    `  --cx-border-subtle: ${palette.borderSubtle};`,
    `  --cx-border-focus: ${palette.borderFocus};`,
    "}",
    "@media (prefers-reduced-motion: reduce) {",
    "  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }",
    "}",
    "```",
    "",
    "## 2. Typography & Motion",
    "- Display / UI Sans: clean geometric grotesque (`clamp(1.25rem, 2vw, 2rem)` display, `0.9375rem` body).",
    "- Monospace: `JetBrains Mono` / `ui-monospace` for Terminal Sandbox & IDs (`tabular-nums`).",
    "- Motion Curve: `cubic-bezier(0.22, 1, 0.36, 1)` at `180ms` with `prefers-reduced-motion` support.",
  ].join("\n");

  const checksum = sha256(content);
  const artifact: Artifact = {
    id: deterministicId("art-ds", `${request.projectId}:${request.id}`),
    organizationId:
      request.organizationId ?? "00000000-0000-0000-0000-000000000001",
    projectId: request.projectId,
    title: `Design System: ${request.objective.slice(0, 64)}`,
    artifactType: "design_system",
    status: "review",
    version: "1.0.0",
    summary: `Semantic design tokens, typographic scale, motion rules, and primitive specs for "${request.objective}".`,
    contentUri: `cortex://artifacts/design/${request.projectId}/design-system-${request.id}.md`,
    checksum,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: "design-agent",
    tags: ["design", "design-system", "tokens"],
    metadata: {
      workRequestId: request.id,
      activity: "DesignSystemCreation",
      hasReducedMotionFallback: true,
      palette,
      toolsReferenced: ["figma", "v0"],
    },
  };

  return { artifact, content };
}
