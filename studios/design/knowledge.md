# knowledge.md — Design Studio Domain Knowledge

## 1. Visual & Spatial Hierarchy
- Favor restrained, intentional spatial grids (12-column desktop, 8-column tablet, 4-column mobile) with explicit rhythm (`4px` base unit).
- Enforce one primary visual focal point per viewport fold and clear typographic scale (`display`, `h1`, `h2`, `h3`, `body`, `mono`, `caption`).

## 2. Semantic Token Architecture
- Surfaces: `canvas`, `elevated`, `recessed`, `overlay`, `interactive`.
- Ink/Foreground: `primary`, `secondary`, `muted`, `inverse`, `accent`, `danger`, `warning`, `success`.
- Borders: `subtle`, `default`, `strong`, `focus-ring`.
- Motion: Short, purposeful transitions (`140ms–240ms`, `cubic-bezier(0.22, 1, 0.36, 1)`) respecting `prefers-reduced-motion`.

## 3. Component Specification Standard
- Every component specification lists: props/variants, interactive states (`default`, `hover`, `focus-visible`, `active`, `disabled`), ARIA role/attributes, keyboard bindings, and data bindings.

## 4. Handoff Package Structure
- Upstream inputs consumed: `PRD`, `Roadmap`, `Requirement`.
- Downstream consumers via Jarvis: `Architecture Studio` (for API payload shaping & component/state contracts) and `Development Studio` (for frontend implementation).
