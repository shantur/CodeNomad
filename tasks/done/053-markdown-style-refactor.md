# Task 053 - Markdown & Code Block Styling Refactor

## Goal
Extract the remaining markdown/code-block styling from `src/index.css` into token-aware utilities and ensure all prose rendering uses the shared system.

## Prerequisites
- Task 052 complete (panels cleaned up).

## Acceptance Criteria
- [ ] `src/index.css` no longer contains `.prose`, `.markdown-code-block`, `.code-block-header`, `.code-block-copy`, or `.code-block-inline` blocks; equivalent styling lives in a new `src/styles/markdown.css` (imported from `index.css`) and/or token helpers.
- [ ] New markdown helpers rely on tokens for colors, borders, and typography (no hard-coded hex values).
- [ ] Code block copy button, language label, and inline code maintain current interaction and contrast in both themes.
- [ ] `MessagePart` markdown rendering (`src/components/markdown.tsx`) automatically picks up the new styling without component changes.

## Steps
1. Move markdown-related CSS into a dedicated `styles/markdown.css` file, rewriting colors with tokens.
2. Replace any legacy values (e.g., `text-gray-700`) with token references.
3. Update `src/index.css` to import the new stylesheet after tokens/components layers.
4. Verify formatted markdown in the message stream (headings, lists, code blocks, copy button).

## Testing Checklist
- [ ] Run `npm run build`.
- [ ] Manually view messages with markdown (headings, inline code, block code, tables) in both themes.

## Dependencies
- Depends on Task 052.
- Blocks final cleanup task for attachment/keyboard chips.

## Estimated Time
0.75 hours

## Notes
- Branch suggestion: `feature/task-053-markdown-style-refactor`.
- If additional tokens are needed (e.g., `--surface-prose`), document them in the PR.
