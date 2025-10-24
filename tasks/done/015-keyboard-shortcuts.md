# Task 015: Keyboard Shortcuts

## Goal

Implement comprehensive keyboard shortcuts for efficient keyboard-first navigation, inspired by the TUI's keyboard system but adapted for desktop multi-instance/multi-session workflow.

## Prerequisites

- ✅ 001-013 completed
- ✅ All core UI components built
- ✅ Message stream, prompt input, tabs working

## Decisions Made

1. **Tab Navigation**: Use `Cmd/Ctrl+[/]` for instances, `Cmd/Ctrl+Shift+[/]` for sessions
2. **Clear Input**: Use `Cmd/Ctrl+K` (common in Slack, Discord, VS Code)
3. **Escape Behavior**: Context-dependent (blur when idle, interrupt when busy)
4. **Message History**: Per-instance, stored in IndexedDB (embedded local database)
5. **Agent Cycling**: Include Tab/Shift+Tab for agent cycling, add model selector focus shortcut
6. **Leader Key**: Skip it - use standard Cmd/Ctrl patterns
7. **Platform**: Cmd on macOS, Ctrl elsewhere (standard cross-platform pattern)
8. **View Controls**: Not needed for MVP
9. **Help Dialog**: Not needed - inline hints instead

## Key Principles

### Smart Inline Hints

Instead of a help dialog, show shortcuts contextually:

- Display hints next to actions they affect
- Keep hints subtle (small text, muted color)
- Use platform-specific symbols (⌘ on Mac, Ctrl elsewhere)
- Examples already in app: "Enter to send • Shift+Enter for new line"

### Modular Architecture

Build shortcuts in a centralized, configurable system:

- Single source of truth for all shortcuts
- Easy to extend for future customization
- Clear separation between shortcut definition and handler logic
- Registry pattern for discoverability

## Shortcuts to Implement

### Navigation (Tabs)

**Already Implemented:**

- [x] `Cmd/Ctrl+1-9` - Switch to instance tab by index
- [x] `Cmd/Ctrl+N` - New instance (select folder)
- [x] `Cmd/Ctrl+T` - New session in active instance
- [x] `Cmd/Ctrl+W` - Close active **parent** session (only)

**To Implement:**

- [ ] `Cmd/Ctrl+[` - Previous instance tab
- [ ] `Cmd/Ctrl+]` - Next instance tab
- [ ] `Cmd/Ctrl+Shift+[` - Previous session tab
- [ ] `Cmd/Ctrl+Shift+]` - Next session tab
- [ ] `Cmd/Ctrl+Shift+L` - Switch to Logs tab

### Input Management

**Already Implemented:**

- [x] `Enter` - Send message
- [x] `Shift+Enter` - New line

**To Implement:**

- [ ] `Cmd/Ctrl+K` - Clear input
- [ ] `Cmd/Ctrl+L` - Focus prompt input
- [ ] `Up Arrow` - Previous message in history (when at start of input)
- [ ] `Down Arrow` - Next message in history (when in history mode)
- [ ] `Escape` - Context-dependent:
  - When idle: Blur input / close modals
  - When busy: Interrupt session (requires confirmation)

### Agent/Model Selection

**To Implement:**

- [ ] `Tab` - Cycle to next agent (when input empty or not focused)
- [ ] `Shift+Tab` - Cycle to previous agent
- [ ] `Cmd/Ctrl+M` - Focus model selector dropdown

### Message Navigation

**To Implement:**

- [ ] `PgUp` - Scroll messages up
- [ ] `PgDown` - Scroll messages down
- [ ] `Home` - Jump to first message
- [ ] `End` - Jump to last message

## Architecture Design

### 1. Centralized Keyboard Registry

```typescript
// src/lib/keyboard-registry.ts

export interface KeyboardShortcut {
  id: string
  key: string
  modifiers: {
    ctrl?: boolean
    meta?: boolean
    shift?: boolean
    alt?: boolean
  }
  handler: () => void
  description: string
  context?: "global" | "input" | "messages" // Where it works
  condition?: () => boolean // Runtime condition check
}

class KeyboardRegistry {
  private shortcuts = new Map<string, KeyboardShortcut>()

  register(shortcut: KeyboardShortcut) {
    this.shortcuts.set(shortcut.id, shortcut)
  }

  unregister(id: string) {
    this.shortcuts.delete(id)
  }

  findMatch(event: KeyboardEvent): KeyboardShortcut | null {
    for (const shortcut of this.shortcuts.values()) {
      if (this.matches(event, shortcut)) {
        // Check context
        if (shortcut.context === "input" && !this.isInputFocused()) continue
        if (shortcut.context === "messages" && this.isInputFocused()) continue

        // Check runtime condition
        if (shortcut.condition && !shortcut.condition()) continue

        return shortcut
      }
    }
    return null
  }

  private matches(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
    const ctrlMatch = event.ctrlKey === !!shortcut.modifiers.ctrl
    const metaMatch = event.metaKey === !!shortcut.modifiers.meta
    const shiftMatch = event.shiftKey === !!shortcut.modifiers.shift
    const altMatch = event.altKey === !!shortcut.modifiers.alt

    return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch
  }

  private isInputFocused(): boolean {
    const active = document.activeElement
    return active?.tagName === "TEXTAREA" || active?.tagName === "INPUT" || active?.hasAttribute("contenteditable")
  }

  getByContext(context: string): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter((s) => !s.context || s.context === context)
  }
}

export const keyboardRegistry = new KeyboardRegistry()
```

### 2. Cross-Platform Key Helper

```typescript
// src/lib/keyboard-utils.ts

export const isMac = () => navigator.platform.includes("Mac")

export const modKey = (event?: KeyboardEvent) => {
  if (!event) return isMac() ? "metaKey" : "ctrlKey"
  return isMac() ? event.metaKey : event.ctrlKey
}

export const modKeyPressed = (event: KeyboardEvent) => {
  return isMac() ? event.metaKey : event.ctrlKey
}

export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = []

  if (shortcut.modifiers.ctrl || shortcut.modifiers.meta) {
    parts.push(isMac() ? "⌘" : "Ctrl")
  }
  if (shortcut.modifiers.shift) {
    parts.push(isMac() ? "⇧" : "Shift")
  }
  if (shortcut.modifiers.alt) {
    parts.push(isMac() ? "⌥" : "Alt")
  }

  parts.push(shortcut.key.toUpperCase())

  return parts.join(isMac() ? "" : "+")
}
```

### 3. IndexedDB Storage Layer

```typescript
// src/lib/db.ts

const DB_NAME = "opencode-client"
const DB_VERSION = 1
const HISTORY_STORE = "message-history"

let db: IDBDatabase | null = null

async function getDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object stores
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE)
      }
    }
  })
}

export async function saveHistory(instanceId: string, history: string[]): Promise<void> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(HISTORY_STORE, "readwrite")
    const store = tx.objectStore(HISTORY_STORE)
    const request = store.put(history, instanceId)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function loadHistory(instanceId: string): Promise<string[]> {
  try {
    const database = await getDB()
    return new Promise((resolve, reject) => {
      const tx = database.transaction(HISTORY_STORE, "readonly")
      const store = tx.objectStore(HISTORY_STORE)
      const request = store.get(instanceId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || [])
    })
  } catch (error) {
    console.warn("Failed to load history from IndexedDB:", error)
    return []
  }
}

export async function deleteHistory(instanceId: string): Promise<void> {
  const database = await getDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(HISTORY_STORE, "readwrite")
    const store = tx.objectStore(HISTORY_STORE)
    const request = store.delete(instanceId)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}
```

### 4. Message History Management

Per-instance storage using IndexedDB (persists across app restarts):

```typescript
// src/stores/message-history.ts

import { saveHistory, loadHistory, deleteHistory } from "../lib/db"

const MAX_HISTORY = 100

// In-memory cache
const instanceHistories = new Map<string, string[]>()
const historyLoaded = new Set<string>()

export async function addToHistory(instanceId: string, text: string): Promise<void> {
  // Ensure history is loaded
  await ensureHistoryLoaded(instanceId)

  const history = instanceHistories.get(instanceId) || []

  // Add to front (newest first)
  history.unshift(text)

  // Limit to MAX_HISTORY
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY
  }

  // Update cache and persist
  instanceHistories.set(instanceId, history)

  // Persist to IndexedDB (async, don't wait)
  saveHistory(instanceId, history).catch((err) => {
    console.warn("Failed to persist message history:", err)
  })
}

export async function getHistory(instanceId: string): Promise<string[]> {
  await ensureHistoryLoaded(instanceId)
  return instanceHistories.get(instanceId) || []
}

export async function clearHistory(instanceId: string): Promise<void> {
  // Manually clear history (not called on instance stop)
  instanceHistories.delete(instanceId)
  historyLoaded.delete(instanceId)
  await deleteHistory(instanceId)
}

async function ensureHistoryLoaded(instanceId: string): Promise<void> {
  if (historyLoaded.has(instanceId)) {
    return
  }

  try {
    const history = await loadHistory(instanceId)
    instanceHistories.set(instanceId, history)
    historyLoaded.add(instanceId)
  } catch (error) {
    console.warn("Failed to load history:", error)
    instanceHistories.set(instanceId, [])
    historyLoaded.add(instanceId)
  }
}
```

### 4. Inline Hint Component

```typescript
// src/components/keyboard-hint.tsx

import { Component } from 'solid-js'
import { formatShortcut, type KeyboardShortcut } from '../lib/keyboard-utils'

const KeyboardHint: Component<{
  shortcuts: KeyboardShortcut[]
  separator?: string
}> = (props) => {
  return (
    <span class="text-xs text-gray-500 dark:text-gray-400">
      {props.shortcuts.map((shortcut, i) => (
        <>
          {i > 0 && <span class="mx-1">{props.separator || '•'}</span>}
          <kbd class="font-mono">{formatShortcut(shortcut)}</kbd>
          <span class="ml-1">{shortcut.description}</span>
        </>
      ))}
    </span>
  )
}

export default KeyboardHint
```

## Implementation Steps

### Step 1: Create Keyboard Infrastructure

1. Create `src/lib/keyboard-registry.ts` - Central registry
2. Create `src/lib/keyboard-utils.ts` - Platform helpers
3. Create `src/lib/db.ts` - IndexedDB storage layer
4. Create `src/stores/message-history.ts` - History management
5. Create `src/components/keyboard-hint.tsx` - Inline hints component

### Step 2: Register Navigation Shortcuts

```typescript
// src/lib/shortcuts/navigation.ts

import { keyboardRegistry } from "../keyboard-registry"
import { instances, activeInstanceId, setActiveInstanceId } from "../../stores/instances"
import { getSessions, activeSessionId, setActiveSession } from "../../stores/sessions"

export function registerNavigationShortcuts() {
  // Instance navigation
  keyboardRegistry.register({
    id: "instance-prev",
    key: "[",
    modifiers: { ctrl: true, meta: true },
    handler: () => {
      const ids = Array.from(instances().keys())
      const current = ids.indexOf(activeInstanceId() || "")
      const prev = current === 0 ? ids.length - 1 : current - 1
      if (ids[prev]) setActiveInstanceId(ids[prev])
    },
    description: "previous instance",
    context: "global",
  })

  keyboardRegistry.register({
    id: "instance-next",
    key: "]",
    modifiers: { ctrl: true, meta: true },
    handler: () => {
      const ids = Array.from(instances().keys())
      const current = ids.indexOf(activeInstanceId() || "")
      const next = (current + 1) % ids.length
      if (ids[next]) setActiveInstanceId(ids[next])
    },
    description: "next instance",
    context: "global",
  })

  // Session navigation
  keyboardRegistry.register({
    id: "session-prev",
    key: "[",
    modifiers: { ctrl: true, meta: true, shift: true },
    handler: () => {
      const instanceId = activeInstanceId()
      if (!instanceId) return

      const sessions = getSessions(instanceId)
      const ids = sessions.map((s) => s.id).concat(["logs"])
      const current = ids.indexOf(activeSessionId().get(instanceId) || "")
      const prev = current === 0 ? ids.length - 1 : current - 1
      if (ids[prev]) setActiveSession(instanceId, ids[prev])
    },
    description: "previous session",
    context: "global",
  })

  keyboardRegistry.register({
    id: "session-next",
    key: "]",
    modifiers: { ctrl: true, meta: true, shift: true },
    handler: () => {
      const instanceId = activeInstanceId()
      if (!instanceId) return

      const sessions = getSessions(instanceId)
      const ids = sessions.map((s) => s.id).concat(["logs"])
      const current = ids.indexOf(activeSessionId().get(instanceId) || "")
      const next = (current + 1) % ids.length
      if (ids[next]) setActiveSession(instanceId, ids[next])
    },
    description: "next session",
    context: "global",
  })

  // Logs tab
  keyboardRegistry.register({
    id: "switch-to-logs",
    key: "l",
    modifiers: { ctrl: true, meta: true, shift: true },
    handler: () => {
      const instanceId = activeInstanceId()
      if (instanceId) setActiveSession(instanceId, "logs")
    },
    description: "logs tab",
    context: "global",
  })
}
```

### Step 3: Register Input Shortcuts

```typescript
// src/lib/shortcuts/input.ts

export function registerInputShortcuts(clearInput: () => void, focusInput: () => void) {
  keyboardRegistry.register({
    id: "clear-input",
    key: "k",
    modifiers: { ctrl: true, meta: true },
    handler: clearInput,
    description: "clear input",
    context: "global",
  })

  keyboardRegistry.register({
    id: "focus-input",
    key: "l",
    modifiers: { ctrl: true, meta: true },
    handler: focusInput,
    description: "focus input",
    context: "global",
  })
}
```

### Step 4: Update PromptInput with History Navigation

```typescript
// src/components/prompt-input.tsx

import { createSignal, onMount } from 'solid-js'
import { addToHistory, getHistory } from '../stores/message-history'

const PromptInput: Component<Props> = (props) => {
  const [input, setInput] = createSignal('')
  const [historyIndex, setHistoryIndex] = createSignal(-1)
  const [history, setHistory] = createSignal<string[]>([])

  let textareaRef: HTMLTextAreaElement | undefined

  // Load history on mount
  onMount(async () => {
    const loaded = await getHistory(props.instanceId)
    setHistory(loaded)
  })

  async function handleKeyDown(e: KeyboardEvent) {
    const textarea = textareaRef
    if (!textarea) return

    const atStart = textarea.selectionStart === 0
    const currentHistory = history()

    // Up arrow - navigate to older message
    if (e.key === 'ArrowUp' && atStart && currentHistory.length > 0) {
      e.preventDefault()
      const newIndex = Math.min(historyIndex() + 1, currentHistory.length - 1)
      setHistoryIndex(newIndex)
      setInput(currentHistory[newIndex])
    }

    // Down arrow - navigate to newer message
    if (e.key === 'ArrowDown' && historyIndex() >= 0) {
      e.preventDefault()
      const newIndex = historyIndex() - 1
      if (newIndex >= 0) {
        setHistoryIndex(newIndex)
        setInput(currentHistory[newIndex])
      } else {
        setHistoryIndex(-1)
        setInput('')
      }
    }
  }

  async function handleSend() {
    const text = input().trim()
    if (!text) return

    // Add to history (async, per instance)
    await addToHistory(props.instanceId, text)

    // Reload history for next navigation
    const updated = await getHistory(props.instanceId)
    setHistory(updated)
    setHistoryIndex(-1)

    await props.onSend(text)
    setInput('')
  }

  return (
    <div class="prompt-input">
      <textarea
        ref={textareaRef}
        value={input()}
        onInput={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your message..."
      />

      <KeyboardHint shortcuts={[
        { description: 'to send', key: 'Enter', modifiers: {} },
        { description: 'for new line', key: 'Enter', modifiers: { shift: true } }
      ]} />
    </div>
  )
}
```

### Step 5: Agent Cycling

```typescript
// src/lib/shortcuts/agent.ts

export function registerAgentShortcuts(
  cycleAgent: () => void,
  cycleAgentReverse: () => void,
  focusModelSelector: () => void,
) {
  keyboardRegistry.register({
    id: "agent-next",
    key: "Tab",
    modifiers: {},
    handler: cycleAgent,
    description: "next agent",
    context: "global",
    condition: () => !isInputFocused(), // Only when not typing
  })

  keyboardRegistry.register({
    id: "agent-prev",
    key: "Tab",
    modifiers: { shift: true },
    handler: cycleAgentReverse,
    description: "previous agent",
    context: "global",
    condition: () => !isInputFocused(),
  })

  keyboardRegistry.register({
    id: "focus-model",
    key: "m",
    modifiers: { ctrl: true, meta: true },
    handler: focusModelSelector,
    description: "focus model",
    context: "global",
  })
}
```

### Step 6: Escape Key Context Handling

```typescript
// src/lib/shortcuts/escape.ts

export function registerEscapeShortcut(
  isSessionBusy: () => boolean,
  interruptSession: () => void,
  blurInput: () => void,
  closeModal: () => void,
) {
  keyboardRegistry.register({
    id: "escape",
    key: "Escape",
    modifiers: {},
    handler: () => {
      // Priority 1: Close modal if open
      if (hasOpenModal()) {
        closeModal()
        return
      }

      // Priority 2: Interrupt if session is busy
      if (isSessionBusy()) {
        interruptSession()
        return
      }

      // Priority 3: Blur input
      blurInput()
    },
    description: "cancel/close",
    context: "global",
  })
}
```

### Step 7: Setup Global Listener in App

```typescript
// src/App.tsx

import { registerNavigationShortcuts } from "./lib/shortcuts/navigation"
import { registerInputShortcuts } from "./lib/shortcuts/input"
import { registerAgentShortcuts } from "./lib/shortcuts/agent"
import { registerEscapeShortcut } from "./lib/shortcuts/escape"
import { keyboardRegistry } from "./lib/keyboard-registry"

onMount(() => {
  // Register all shortcuts
  registerNavigationShortcuts()
  registerInputShortcuts(
    () => setInput(""),
    () => document.querySelector("textarea")?.focus(),
  )
  registerAgentShortcuts(handleCycleAgent, handleCycleAgentReverse, () =>
    document.querySelector("[data-model-selector]")?.focus(),
  )
  registerEscapeShortcut(
    () => activeInstance()?.status === "streaming",
    handleInterrupt,
    () => document.activeElement?.blur(),
    hideModal,
  )

  // Global keydown handler
  const handleKeyDown = (e: KeyboardEvent) => {
    const shortcut = keyboardRegistry.findMatch(e)
    if (shortcut) {
      e.preventDefault()
      shortcut.handler()
    }
  }

  window.addEventListener("keydown", handleKeyDown)

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown)
  })
})
```

### Step 8: Add Inline Hints Throughout UI

**In PromptInput:**

```tsx
<KeyboardHint
  shortcuts={[getShortcut("enter-to-send"), getShortcut("shift-enter-newline"), getShortcut("cmd-k-clear")]}
/>
```

**In Instance Tabs:**

```tsx
<KeyboardHint shortcuts={[getShortcut("cmd-1-9"), getShortcut("cmd-brackets")]} />
```

**In Agent Selector:**

```tsx
<KeyboardHint shortcuts={[getShortcut("tab-cycle")]} />
```

## Where to Show Hints

1. **Prompt Input Area** (bottom)
   - Enter/Shift+Enter (already shown)
   - Add: Cmd+K to clear, ↑↓ for history

2. **Instance Tabs** (subtle tooltip or header)
   - Cmd+1-9, Cmd+[/]

3. **Session Tabs** (same as instance)
   - Cmd+Shift+[/]

4. **Agent/Model Selectors** (placeholder or label)
   - Tab/Shift+Tab, Cmd+M

5. **Empty State** (when no messages)
   - Common shortcuts overview

## Testing Checklist

### Navigation

- [ ] Cmd/Ctrl+[ / ] cycles instance tabs
- [ ] Cmd/Ctrl+Shift+[ / ] cycles session tabs
- [ ] Cmd/Ctrl+1-9 jumps to instance
- [ ] Cmd/Ctrl+T creates new session
- [ ] Cmd/Ctrl+W closes parent session only
- [ ] Cmd/Ctrl+Shift+L switches to logs

### Input

- [ ] Cmd/Ctrl+K clears input
- [ ] Cmd/Ctrl+L focuses input
- [ ] Up arrow loads previous message (when at start)
- [ ] Down arrow navigates forward in history
- [ ] History is per-instance
- [ ] History persists in IndexedDB across app restarts
- [ ] History limited to 100 entries (not 50)
- [ ] History loads on component mount
- [ ] History NOT cleared when instance stops

### Agent/Model

- [ ] Tab cycles agents (when not in input)
- [ ] Shift+Tab cycles agents backward
- [ ] Cmd/Ctrl+M focuses model selector

### Context Behavior

- [ ] Escape closes modals first
- [ ] Escape interrupts when busy
- [ ] Escape blurs input when idle
- [ ] Shortcuts don't fire in wrong context

### Cross-Platform

- [ ] Works with Cmd on macOS
- [ ] Works with Ctrl on Windows
- [ ] Works with Ctrl on Linux
- [ ] Hints show correct keys per platform

### Inline Hints

- [ ] Hints visible but not intrusive
- [ ] Correct platform symbols shown
- [ ] Hints appear in relevant locations
- [ ] No excessive screen space used

## Dependencies

**Requires:**

- Tasks 001-013 completed

**Blocks:**

- None (final MVP task)

## Estimated Time

4-5 hours

## Success Criteria

✅ Task complete when:

- All shortcuts implemented and working
- Message history per-instance, persisted in IndexedDB
- History stores 100 most recent prompts
- History persists across app restarts and instance stops
- Agent cycling with Tab/Shift+Tab
- Context-aware Escape behavior
- Inline hints shown throughout UI
- Cross-platform (Cmd/Ctrl) working
- Modular registry system for future customization
- Can navigate entire app efficiently with keyboard

## Notes on History Storage

**Why per-instance (folder path)?**

- User opens same project folder multiple times → same history
- More intuitive: history tied to project, not ephemeral instance
- Survives instance restarts without losing context

**Why 100 entries?**

- More generous than TUI's 50
- ~20KB per instance (100 × ~200 chars)
- Plenty for typical usage patterns
- Can increase later if needed

**Cleanup Strategy:**

- No automatic cleanup (history persists indefinitely)
- Could add manual "Clear History" option in future
- IndexedDB handles storage efficiently
