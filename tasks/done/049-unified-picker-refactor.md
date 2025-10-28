# Task 049 - Unified & File Picker Tailwind Refactor

## Goal
Replace the hardcoded gray/blue class stacks in `UnifiedPicker` and `FilePicker` with token-based Tailwind utilities and shared dropdown helpers.

## Prerequisites
- Tasks 041-048 complete (tokens, message components, tabs, prompt input refactored).

## Acceptance Criteria
- [ ] `src/components/unified-picker.tsx` and `src/components/file-picker.tsx` reference token-backed utility classes for surfaces, borders, typography, and states.
- [ ] A shared dropdown utility block lives in `src/styles/components.css` (e.g., `.dropdown-surface`, `.dropdown-item`, `.dropdown-highlight`).
- [ ] Legacy class strings using `bg-white`, `bg-gray-*`, `dark:bg-gray-*`, etc., are removed from both components.
- [ ] Loading/empty states, highlights, and diff chips preserve their current behavior in light/dark themes.

## Steps
1. Inventory all className usages in the two picker components.
2. Add reusable dropdown utilities to `components.css`, powered by the existing tokens.
3. Update component markup to use the new helpers and Tailwind utilities with `var(--token)` references for color.
4. Smoke test: open the picker, filter results, confirm loading/empty states and diff counts.

## Testing Checklist
- [ ] Run `npm run build`.
- [ ] In dev mode, trigger the picker from prompt input (file mention) and ensure keyboard navigation/hover states look correct.

## Dependencies
- Blocks further cleanup of selector components and modals.

## Estimated Time
0.75 hours

## Notes
- Branch name suggestion: `feature/task-049-unified-picker-refactor`.
- Include before/after light & dark screenshots in the PR description if any visual tweaks occur.
