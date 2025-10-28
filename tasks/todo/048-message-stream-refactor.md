# Task 048 - Message Stream & Tool Call Refactor

## Goal
Finish migrating the message stream container, tool call blocks, and reasoning UI to Tailwind utilities and shared tokens.

## Prerequisites
- Tasks 045-047 complete (message item, prompt input, and tabs refactored).

## Acceptance Criteria
- [ ] `src/components/message-stream.tsx`, `src/components/message-part.tsx`, and tool call subcomponents no longer depend on legacy classes (`.message-stream`, `.tool-call-message`, `.tool-call`, `.tool-call-header`, `.tool-call-preview`, `.tool-call-details`, `.reasoning-*`, `.scroll-to-bottom`, etc.).
- [ ] Global CSS definitions for these selectors are removed from `src/index.css`, replaced by Tailwind utilities and token-aware helpers.
- [ ] Scroll behavior (auto-scroll, “scroll to bottom” button) and collapsing/expanding tool calls behave as before in light/dark modes.
- [ ] Markdown/code blocks continue to render properly within the new layout.

## Steps
1. Inventory remaining global selectors in `src/index.css` associated with the stream/tool-call UI.
2. Update component markup to use Tailwind classes, creating shared helpers in `src/styles/components.css` when patterns repeat.
3. Remove or rewrite the corresponding CSS blocks in `src/index.css` to avoid duplication.
4. Validate tool call states (pending/running/success/error), reasoning blocks, and markdown rendering visually.

## Testing Checklist
- [ ] Run `npm run build`.
- [ ] In dev mode, stream a message with tool calls and reasoning to ensure toggles and scroll helpers work.

## Dependencies
- Depends on prompt input and tab refactors to reduce merge conflicts.
- Unlocks subsequent layout cleanups for logs and empty states.

## Estimated Time
1.25 hours

## Notes
- Branch suggestion: `feature/task-048-message-stream-refactor`.
- Capture short screen recording or screenshots if tool call layout adjustments were required.
