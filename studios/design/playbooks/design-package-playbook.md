# Playbook: End-to-End Design Package (`DesignWorkflow`)

1. **Initialize Context (`initialize`)**:
   - Load `manifest.yaml`, `constraints.md`, `knowledge.md`, skills, templates, tool adapters (`v0`, `figma`, `magic_patterns`, `readdy`, `uizard`), and `memory/local-memory.json`.
2. **Activity 1 — `FlowDesign` (`createFlows`)**:
   - Synthesize end-to-end actor journeys, interaction states, and transition contracts into an `ui_design` artifact.
3. **Activity 2 — `WireframeGeneration` (`createWireframes`)**:
   - Map responsive layout zones, visual focal points, and state variants into a `wireframe` artifact.
4. **Activity 3 — `DesignSystemCreation` (`createDesignSystem`)**:
   - Emit semantic design tokens, typographic scale, component specifications, and accessible contrast pairings into a `design_system` artifact.
5. **Activity 4 — `AccessibilityReview` (`accessibilityReview`)**:
   - Compute WCAG 2.1 AA relative luminance contrast ratios (`>= 4.5:1` text, `>= 3.0:1` UI), validate landmark & keyboard coverage, and attach audit results to metadata.
   - If critical WCAG blockers are detected, return `WorkResponse.status = "blocked"` with actionable remediation items.
6. **Activity 5 — `DesignReview` (`validate` + `handoff`)**:
   - Validate all emitted artifacts against `DesignStudio` gates and produce a `StudioHandoffRequest` targeting `architecture` via Jarvis + Agent Mesh.
