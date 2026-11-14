# Skill: WCAG 2.1 AA Accessibility Audit

## Objective
Verify every wireframe and token system against WCAG 2.1 AA prior to exiting Design Studio.

## Mandatory Gates
1. **Color Contrast**: Relative luminance ratio >= `4.5:1` for body copy and >= `3.0:1` for large text (`>=18pt` / `14pt` bold) and interactive focus boundaries.
2. **Keyboard Operability**: Complete `Tab` / `Shift+Tab` traversal, `Escape` dismissal for floating workspaces, and zero keyboard traps.
3. **Semantic Structure**: Single `<h1>`, logical landmark regions (`banner`, `main`, `complementary`), explicit `aria-label` on icon-only controls, and `aria-live="polite"` for asynchronous agent updates.
