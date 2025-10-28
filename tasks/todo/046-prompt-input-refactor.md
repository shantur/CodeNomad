# Task 046 - Prompt Input Tailwind Refactor

## Goal
Port the prompt input stack to Tailwind utilities and shared tokens so it no longer depends on custom selectors in `src/index.css`.

## Prerequisites
- Tasks 043-045 complete (color and typography tokens available, message item refactored).

## Acceptance Criteria
- [ ] `src/components/prompt-input.tsx` and nested elements use Tailwind + token classes for layout, borders, and typography.
- [ ] Legacy selectors in `src/index.css` matching `.prompt-input-container`, `.prompt-input-wrapper`, `.prompt-input`, `.send-button`, `.prompt-input-hints`, `.hint`, `.hint kbd`, and related variants are removed or replaced with token-based utilities.
- [ ] Input states (focus, disabled, multi-line expansion) and keyboard hint row look identical in light/dark modes.
- [ ] Esc debounce handling and attachment hooks remain functional.

## Steps
1. Audit existing markup in `prompt-input.tsx` and note the current class usage.
2. Replace className strings with Tailwind utility stacks that reference CSS variables (e.g., `bg-[var(--surface-base)]`, `text-[var(--text-muted)]`).
3. Introduce small reusable helpers (e.g., `.kbd` token utility) in `src/styles/components.css` if patterns recur elsewhere.
4. Delete superseded CSS blocks from `src/index.css` once equivalents exist.
5. Verify light/dark theme parity and interaction states manually.

## Testing Checklist
- [ ] Run `npm run build`.
- [ ] In dev mode, send a message with/without attachments, toggle disabled state, and confirm keyboard hints render correctly.

## Dependencies
- Blocks future component refactors for the input stack.

## Estimated Time
0.75 hours

## Notes
- Branch suggestion: `feature/task-046-prompt-input-refactor`.
- Capture light/dark screenshots for review if any subtle spacing changes occur.
