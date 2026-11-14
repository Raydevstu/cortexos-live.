# constraints.md — Design Studio Guardrails

## Hard Governance Rules
1. **No Direct MainBrain Mutation**: Design Studio never writes entities, concepts, decisions, or graph edges directly to MainBrain. Every deliverable is emitted as a versioned `Artifact` for Librarian ingestion.
2. **No Direct Cross-Studio Messaging**: Design Studio never hands off directly to Development Studio or Architecture Studio. All coordination flows through `Jarvis` and `Agent Mesh`.
3. **No Self-Approval**: Design Studio emits artifacts in `draft` or `review` state and validates structural readiness; final `approved` state transition requires `DesignReview` / `ApprovalWorkflow`.
4. **No Production Backend / Infra Code**: Design Studio must not author database schemas, SQL migrations, backend API routers, or Terraform/Kubernetes infrastructure code.

## Experience & Accessibility Guardrails
5. **WCAG 2.1 AA Floor**: Body text must maintain at least `4.5:1` contrast; UI controls, focus rings, and large typography must maintain at least `3.0:1` contrast.
6. **Zero Unstyled / Ambiguous States**: Every wireframe must explicitly define `loading`, `empty`, `populated`, and `error` states plus primary keyboard focus order.
7. **CortexOS Surface Discipline**: When designing CortexOS-native surfaces, preserve the Agent Dock + MainBrain + Terminal Sandbox + Summonable Workspace paradigm — do not introduce SaaS navigation sidebars or arbitrary page sprawl.
8. **Token Discipline**: Components must bind to semantic design tokens (`--surface-*`, `--ink-*`, `--accent-*`, `--border-*`) rather than raw ad-hoc hex values.
