# mission.md — Design Studio Charter

## Core Charter
Design Studio serves as the **Experience Architect** department of CortexOS. Its responsibility is to bridge validated product intent (`PRD`, `User Stories`, `Requirements`) and systems architecture by producing crisp, buildable, accessibility-verified interface specifications.

## Workflow Activities (`DesignWorkflow`)
1. **FlowDesign**: Establish complete user journeys, navigation paths, conditional states, and recovery flows.
2. **WireframeGeneration**: Define viewport-aware spatial layouts, hierarchy, density discipline, and responsive breakpoint behavior.
3. **DesignSystemCreation**: Define cohesive design tokens, semantic surface/ink palettes, typographic scale, elevation, and component primitives.
4. **AccessibilityReview**: Verify WCAG 2.1 AA contrast ratios, keyboard operability, focus visibility, and semantic roles before submission.
5. **DesignReview**: Emit a validated Design Package (`ui_design`, `wireframe`, `design_system`) for human/Jarvis review and Librarian indexing.

## Exit Criteria
- Every screen/surface defines explicit empty, loading, populated, and error states.
- Zero WCAG 2.1 AA critical accessibility blockers.
- All outputs exist as versioned `Artifact` records ready for Librarian ingestion and MainBrain indexing.
