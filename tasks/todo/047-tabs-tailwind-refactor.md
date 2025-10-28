# Task 047 - Tabs Tailwind Refactor

## Goal
Refactor instance and session tab components to rely on Tailwind utilities and shared tokens, aligning with the design spec for spacing, typography, and state indicators.

## Prerequisites
- Task 046 complete (prompt input refactor) to keep merges manageable.

## Acceptance Criteria
- [ ] `src/components/instance-tabs.tsx` and `src/components/session-tabs.tsx` no longer reference legacy `.instance-tabs`, `.session-tabs`, `.session-tab` classes from `src/index.css`.
- [ ] Global CSS for tab bars (`.connection-status`, `.status-indicator`, `.status-dot`, `.session-view`) is replaced or minimized in favor of Tailwind utilities and token variables.
- [ ] Active, hover, and error states match the UI spec in both themes, including badges/icons.
- [ ] Tab bar layout remains responsive with overflow scrolling where applicable.

## Steps
1. Catalogue existing tab-related classes used in both components and in `src/index.css`.
2. Convert markup to Tailwind class lists, leveraging tokens for colors/borders (e.g., `bg-[var(--surface-secondary)]`).
3. Add any reusable tab utilities to `src/styles/components.css` if needed.
4. Remove obsolete CSS blocks from `src/index.css` once coverage is confirmed.
5. Smoke-test tab interactions: switching, closing (where allowed), error state display, and overflow behavior.

## Testing Checklist
- [ ] Run `npm run build`.
- [ ] In dev mode, load multiple instances/sessions to verify active styling and horizontal scrolling.

## Dependencies
- Depends on Task 046 completion.
- Blocks subsequent polish tasks for tab-level layout.

## Estimated Time
1.0 hour

## Notes
- Branch suggestion: `feature/task-047-tabs-tailwind-refactor`.
- Provide before/after screenshots (light/dark) of both tab bars in the PR for clarity.
