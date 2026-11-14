import type { StudioManifest } from "../../../packages/studio-sdk/src/index.ts";

export const DESIGN_STUDIO_MANIFEST: StudioManifest = {
  id: "design",
  name: "Design Studio",
  version: "1.0.0",
  mission:
    "Translate validated product requirements into accessible user flows, spatial wireframes, coherent design systems, and reusable UI component specifications.",
  capabilities: [
    "user_flow_architecture",
    "wireframe_generation",
    "design_system_tokens",
    "component_specification",
    "wcag_aa_accessibility_review",
  ],
  supportedArtifacts: ["wireframe", "ui_design", "design_system"],
  tools: ["v0", "figma", "magic_patterns", "readdy", "uizard"],
  constraints: [
    "Never modify MainBrain directly; submit all outputs as tracked Artifacts via Librarian ingestion.",
    "Never communicate directly with Development or Architecture Studios; route all handoffs through Jarvis and Agent Mesh.",
    "Never approve own artifacts past the DesignReview gate without human or Jarvis authorization.",
    "Enforce WCAG 2.1 AA minimum contrast ratios (4.5:1 normal text, 3.0:1 large text/UI boundaries) and full keyboard navigation.",
    "Never emit production backend code, database migrations, or deployment manifests.",
  ],
};
