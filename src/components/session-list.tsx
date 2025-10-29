import { Component, For, Show, createSignal, createEffect, onCleanup, onMount, createMemo } from "solid-js"
import type { Session } from "../types/session"
import { MessageSquare, Info, Plus, X } from "lucide-solid"
import KeyboardHint from "./keyboard-hint"
import { keyboardRegistry } from "../lib/keyboard-registry"

interface SessionListItem {
  id: string
  title: string
  isSpecial?: boolean
  isActive: boolean
  isParent?: boolean
  onSelect: () => void
  onClose?: () => void
}

interface SessionListProps {
  instanceId: string
  sessions: Map<string, Session>
  activeSessionId: string | null
  onSelect: (sessionId: string) => void
  onClose: (sessionId: string) => void
  onNew: () => void
}

const MIN_WIDTH = 200
const MAX_WIDTH = 500
const DEFAULT_WIDTH = 280
const STORAGE_KEY = "opencode-session-sidebar-width"

const SessionList: Component<SessionListProps> = (props) => {
  const [sidebarWidth, setSidebarWidth] = createSignal(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = createSignal(false)
  const [startX, setStartX] = createSignal(0)
  const [startWidth, setStartWidth] = createSignal(DEFAULT_WIDTH)

  let mouseMoveHandler: ((event: MouseEvent) => void) | null = null
  let mouseUpHandler: (() => void) | null = null
  let touchMoveHandler: ((event: TouchEvent) => void) | null = null
  let touchEndHandler: (() => void) | null = null

  onMount(() => {
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return

    const width = Number.parseInt(saved, 10)
    if (Number.isFinite(width) && width >= MIN_WIDTH && width <= MAX_WIDTH) {
      setSidebarWidth(width)
      setStartWidth(width)
    }
  })

  createEffect(() => {
    if (typeof window === "undefined") return
    const width = sidebarWidth()
    window.localStorage.setItem(STORAGE_KEY, width.toString())
  })

  const clampWidth = (width: number) => Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width))

  const removeMouseListeners = () => {
    if (mouseMoveHandler) {
      document.removeEventListener("mousemove", mouseMoveHandler)
      mouseMoveHandler = null
    }
    if (mouseUpHandler) {
      document.removeEventListener("mouseup", mouseUpHandler)
      mouseUpHandler = null
    }
  }

  const removeTouchListeners = () => {
    if (touchMoveHandler) {
      document.removeEventListener("touchmove", touchMoveHandler)
      touchMoveHandler = null
    }
    if (touchEndHandler) {
      document.removeEventListener("touchend", touchEndHandler)
      touchEndHandler = null
    }
  }

  const stopResizing = () => {
    setIsResizing(false)
    removeMouseListeners()
    removeTouchListeners()
  }

  const handleMouseMove = (event: MouseEvent) => {
    if (!isResizing()) return
    const diff = event.clientX - startX()
    const newWidth = clampWidth(startWidth() + diff)
    setSidebarWidth(newWidth)
  }

  const handleMouseUp = () => {
    stopResizing()
  }

  const handleTouchMove = (event: TouchEvent) => {
    if (!isResizing()) return
    const touch = event.touches[0]
    const diff = touch.clientX - startX()
    const newWidth = clampWidth(startWidth() + diff)
    setSidebarWidth(newWidth)
  }

  const handleTouchEnd = () => {
    stopResizing()
  }

  const handleMouseDown = (event: MouseEvent) => {
    event.preventDefault()
    setIsResizing(true)
    setStartX(event.clientX)
    setStartWidth(sidebarWidth())

    mouseMoveHandler = handleMouseMove
    mouseUpHandler = handleMouseUp

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleTouchStart = (event: TouchEvent) => {
    event.preventDefault()
    const touch = event.touches[0]
    setIsResizing(true)
    setStartX(touch.clientX)
    setStartWidth(sidebarWidth())

    touchMoveHandler = handleTouchMove
    touchEndHandler = handleTouchEnd

    document.addEventListener("touchmove", handleTouchMove)
    document.addEventListener("touchend", handleTouchEnd)
  }

  onCleanup(() => {
    removeMouseListeners()
    removeTouchListeners()
  })

  const sessionSections = createMemo(() => {
    const parentItems: SessionListItem[] = []
    const childItems: SessionListItem[] = []

    for (const [id, session] of props.sessions.entries()) {
      const item: SessionListItem = {
        id,
        title: session.title || "Untitled",
        isActive: id === props.activeSessionId,
        isParent: session.parentId === null,
        onSelect: () => props.onSelect(id),
        onClose: session.parentId === null ? () => props.onClose(id) : undefined,
      }

      if (session.parentId === null) {
        parentItems.push(item)
      } else {
        childItems.push(item)
      }
    }

    childItems.sort((a, b) => {
      const sessionA = props.sessions.get(a.id)
      const sessionB = props.sessions.get(b.id)
      if (!sessionA || !sessionB) return 0
      return sessionB.time.updated - sessionA.time.updated
    })

    parentItems.push({
      id: "info",
      title: "Info",
      isSpecial: true,
      isActive: props.activeSessionId === "info",
      onSelect: () => props.onSelect("info"),
    })

    return { parentItems, childItems }
  })

  return (
    <div
      class="session-list-container bg-surface-secondary border-r border-base flex flex-col"
      style={{ width: `${sidebarWidth()}px` }}
    >
      <div
        class="session-resize-handle"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="presentation"
        aria-hidden="true"
      />

      <div class="session-list-header p-3 border-b border-base">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-primary">Sessions</h3>
          <KeyboardHint
            shortcuts={[keyboardRegistry.get("session-prev")!, keyboardRegistry.get("session-next")!].filter(Boolean)}
          />
        </div>
      </div>

      <div class="session-list flex-1 overflow-y-auto">
        <div class="session-section">
          <div class="session-section-header px-3 py-2 text-xs font-semibold text-primary/70 uppercase tracking-wide">
            Parent & Info
          </div>
          <For each={sessionSections().parentItems}>
            {(item) => (
              <div class="session-list-item group">
                <button
                  class={`session-item-base ${
                    item.isActive ? "session-item-active" : "session-item-inactive"
                  } ${item.isSpecial ? "session-item-special" : ""}`}
                  onClick={item.onSelect}
                  title={item.title}
                  role="button"
                  aria-selected={item.isActive}
                >
                  <Show when={item.isSpecial} fallback={<MessageSquare class="w-4 h-4 flex-shrink-0" />}>
                    <Info class="w-4 h-4 flex-shrink-0" />
                  </Show>

                  <span class="session-item-title truncate">{item.title}</span>

                  <Show when={!item.isSpecial && item.onClose}>
                    <span
                      class="session-item-close opacity-0 group-hover:opacity-100 hover:bg-status-error hover:text-white rounded p-0.5 transition-all"
                      onClick={(event) => {
                        event.stopPropagation()
                        item.onClose?.()
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label="Close session"
                    >
                      <X class="w-3 h-3" />
                    </span>
                  </Show>
                </button>
              </div>
            )}
          </For>
        </div>

        <Show when={sessionSections().childItems.length > 0}>
          <div class="session-section">
            <div class="session-section-header px-3 py-2 text-xs font-semibold text-primary/70 uppercase tracking-wide">
              Child Sessions
            </div>
            <For each={sessionSections().childItems}>
              {(item) => (
                <div class="session-list-item group">
                  <button
                    class={`session-item-base ${
                      item.isActive ? "session-item-active" : "session-item-inactive"
                    } ${item.isSpecial ? "session-item-special" : ""}`}
                    onClick={item.onSelect}
                    title={item.title}
                    role="button"
                    aria-selected={item.isActive}
                  >
                    <MessageSquare class="w-4 h-4 flex-shrink-0" />

                    <span class="session-item-title truncate">{item.title}</span>

                    <Show when={!item.isSpecial && item.onClose}>
                      <span
                        class="session-item-close opacity-0 group-hover:opacity-100 hover:bg-status-error hover:text-white rounded p-0.5 transition-all"
                        onClick={(event) => {
                          event.stopPropagation()
                          item.onClose?.()
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label="Close session"
                      >
                        <X class="w-3 h-3" />
                      </span>
                    </Show>
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      <div class="session-list-footer p-3 border-t border-base">
        <button
          class="session-new-button w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm font-medium"
          onClick={props.onNew}
          title="New session (Cmd/Ctrl+T)"
          aria-label="New session"
        >
          <Plus class="w-4 h-4" />
          <span>New Session</span>
        </button>
      </div>
    </div>
  )
}

export default SessionList
