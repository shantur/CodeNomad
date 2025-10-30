import { Component, For, createSignal, createEffect, Show, onMount, onCleanup } from "solid-js"
import { instances } from "../stores/instances"
import { Trash2, ChevronDown } from "lucide-solid"
import type { LogEntry } from "../types/instance"

interface LogsViewProps {
  instanceId: string
}

const logsScrollState = new Map<string, { scrollTop: number; autoScroll: boolean }>()

const LogsView: Component<LogsViewProps> = (props) => {
  let scrollRef: HTMLDivElement | undefined
  const savedState = logsScrollState.get(props.instanceId)
  const [autoScroll, setAutoScroll] = createSignal(savedState?.autoScroll ?? false)

  const instance = () => instances().get(props.instanceId)
  const logs = () => instance()?.logs ?? []

  let renderedCount = 0
  let initialSyncDone = false
  let emptyStateEl: HTMLDivElement | null = null

  onMount(() => {
    if (scrollRef && savedState) {
      scrollRef.scrollTop = savedState.scrollTop
    }
  })

  onCleanup(() => {
    if (scrollRef) {
      logsScrollState.set(props.instanceId, {
        scrollTop: scrollRef.scrollTop,
        autoScroll: autoScroll(),
      })
    }
  })


  const handleScroll = () => {
    if (!scrollRef) return

    const isAtBottom = scrollRef.scrollHeight - scrollRef.scrollTop <= scrollRef.clientHeight + 50

    setAutoScroll(isAtBottom)
  }

  const scrollToBottom = () => {
    if (scrollRef) {
      scrollRef.scrollTop = scrollRef.scrollHeight
      setAutoScroll(true)
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "log-level-error"
      case "warn":
        return "log-level-warn"
      case "debug":
        return "log-level-debug"
      default:
        return "log-level-default"
    }
  }

  const createLogElement = (entry: LogEntry) => {
    const row = document.createElement("div")
    row.className = "log-entry"

    const timestamp = document.createElement("span")
    timestamp.className = "log-timestamp"
    timestamp.textContent = formatTime(entry.timestamp)

    const message = document.createElement("span")
    message.className = `log-message ${getLevelColor(entry.level)}`
    message.textContent = entry.message

    row.append(timestamp, message)
    return row
  }

  createEffect(() => {
    const entries = logs()
    if (!scrollRef) return

    if (entries.length < renderedCount) {
      scrollRef.innerHTML = ""
      renderedCount = 0
      initialSyncDone = false
      if (emptyStateEl && emptyStateEl.parentElement) {
        emptyStateEl.parentElement.removeChild(emptyStateEl)
      }
    }

    if (entries.length === 0) {
      renderedCount = 0
      if (!emptyStateEl) {
        emptyStateEl = document.createElement("div")
        emptyStateEl.className = "log-empty-state"
        emptyStateEl.textContent = "Waiting for server output..."
      }
      if (emptyStateEl.parentElement !== scrollRef) {
        scrollRef.appendChild(emptyStateEl)
      }
      return
    }

    if (emptyStateEl && emptyStateEl.parentElement === scrollRef) {
      scrollRef.removeChild(emptyStateEl)
    }

    for (let i = renderedCount; i < entries.length; i++) {
      const entry = entries[i]
      scrollRef.appendChild(createLogElement(entry))
    }

    renderedCount = entries.length

    if (!initialSyncDone) {
      if (savedState) {
        const maxScrollTop = Math.max(scrollRef.scrollHeight - scrollRef.clientHeight, 0)
        const target = Math.min(savedState.scrollTop, maxScrollTop)
        scrollRef.scrollTop = target
        setAutoScroll(savedState.autoScroll)
      } else {
        scrollRef.scrollTop = scrollRef.scrollHeight
        setAutoScroll(true)
      }
      initialSyncDone = true
      return
    }

    if (autoScroll()) {
      scrollRef.scrollTop = scrollRef.scrollHeight
    }
  })

  return (
    <div class="log-container">
      <div class="log-header">
        <h3 class="text-sm font-medium" style="color: var(--text-secondary)">Server Logs</h3>
      </div>

      <Show when={instance()?.environmentVariables && Object.keys(instance()?.environmentVariables!).length > 0}>
        <div class="env-vars-container">
          <div class="env-vars-title">
            Environment Variables ({Object.keys(instance()?.environmentVariables!).length})
          </div>
          <div class="space-y-1">
            <For each={Object.entries(instance()?.environmentVariables!)}>
              {([key, value]) => (
                <div class="env-var-item">
                  <span class="env-var-key">{key}</span>
                  <span class="env-var-separator">=</span>
                  <span class="env-var-value" title={value}>
                    {value}
                  </span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        class="log-content"
      ></div>

      <Show when={!autoScroll()}>
        <button
          onClick={scrollToBottom}
          class="scroll-to-bottom"
        >
          <ChevronDown class="w-4 h-4" />
          Scroll to bottom
        </button>
      </Show>
    </div>
  )
}

export default LogsView
