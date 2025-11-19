# AGENT NOTES

## Styling Guidelines
- Reuse the existing token & utility layers before introducing new CSS variables or custom properties. Extend `src/styles/tokens.css` / `src/styles/utilities.css` if a shared pattern is needed.
- Keep aggregate entry files (e.g., `src/styles/controls.css`, `messaging.css`, `panels.css`) lean—they should only `@import` feature-specific subfiles located inside `src/styles/{components|messaging|panels}`.
- When adding new component styles, place them beside their peers in the scoped subdirectory (e.g., `src/styles/messaging/new-part.css`) and import them from the corresponding aggregator file.
- Prefer smaller, focused style files (≈150 lines or less) over large monoliths. Split by component or feature area if a file grows beyond that size.
- Co-locate reusable UI patterns (buttons, selectors, dropdowns, etc.) under `src/styles/components/` and avoid redefining the same utility classes elsewhere.
- Document any new styling conventions or directory additions in this file so future changes remain consistent.

## Coding Principles
- Favor KISS by keeping modules narrowly scoped and limiting public APIs to what callers actually need.
- Uphold DRY: share helpers via dedicated modules before copy/pasting logic across stores, components, or scripts.
- Enforce single responsibility; split large files when concerns diverge (state, actions, API, events, etc.).
- Prefer composable primitives (signals, hooks, utilities) over deep inheritance or implicit global state.
- When adding platform integrations (SSE, IPC, SDK), isolate them in thin adapters that surface typed events/actions.

## Tooling Preferences
- Use the `edit` tool for modifying existing files; prefer it over other editing methods.
- Use the `write` tool only when creating new files from scratch.
