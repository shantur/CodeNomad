import { createSignal, Show, For, createEffect, onCleanup } from "solid-js"
import { isToolCallExpanded, toggleToolCallExpanded, setToolCallExpanded } from "../stores/tool-call-state"
import { Markdown } from "./markdown"
import { useTheme } from "../lib/theme"
import type { TextPart } from "../types/message"

// Module-level cache for stable TextPart objects per tool call
const markdownPartCache = new Map<string, TextPart>()
const toolScrollState = new Map<string, { scrollTop: number; atBottom: boolean }>()

function updateScrollState(id: string, element: HTMLElement) {
  if (!id) return
  const distanceFromBottom = element.scrollHeight - (element.scrollTop + element.clientHeight)
  const atBottom = distanceFromBottom <= 2
  toolScrollState.set(id, { scrollTop: element.scrollTop, atBottom })
}

function restoreScrollState(id: string, element: HTMLElement) {
  if (!id) return
  const state = toolScrollState.get(id)
  if (!state) {
    requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight
      updateScrollState(id, element)
    })
    return
  }

  requestAnimationFrame(() => {
    if (state.atBottom) {
      element.scrollTop = element.scrollHeight
    } else {
      const maxScrollTop = Math.max(element.scrollHeight - element.clientHeight, 0)
      element.scrollTop = Math.min(state.scrollTop, maxScrollTop)
    }
    updateScrollState(id, element)
  })
}

function getCachedMarkdownPart(id: string, text: string): TextPart {
  if (!id) {
    // No caching case - return fresh object
    return { type: "text", text }
  }

  const part = markdownPartCache.get(id)
  if (!part) {
    const freshPart: TextPart = { type: "text", text }
    markdownPartCache.set(id, freshPart)
    return freshPart
  }

  if (part.text !== text) {
    const freshPart: TextPart = { type: "text", text }
    markdownPartCache.set(id, freshPart)
    return freshPart
  }

  return part
}

interface ToolCallProps {
  toolCall: any
  toolCallId?: string
}

function getToolIcon(tool: string): string {
  switch (tool) {
    case "bash":
      return "⚡"
    case "edit":
      return "✏️"
    case "read":
      return "📖"
    case "write":
      return "📝"
    case "glob":
      return "🔍"
    case "grep":
      return "🔎"
    case "webfetch":
      return "🌐"
    case "task":
      return "🎯"
    case "todowrite":
    case "todoread":
      return "📋"
    case "list":
      return "📁"
    case "patch":
      return "🔧"
    default:
      return "🔧"
  }
}

function getToolName(tool: string): string {
  switch (tool) {
    case "bash":
      return "Shell"
    case "webfetch":
      return "Fetch"
    case "invalid":
      return "Invalid"
    case "todowrite":
    case "todoread":
      return "Plan"
    default:
      const normalized = tool.replace(/^opencode_/, "")
      return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }
}

function getRelativePath(path: string): string {
  if (!path) return ""
  const parts = path.split("/")
  return parts.slice(-1)[0] || path
}

function getLanguageFromPath(path: string): string | undefined {
  if (!path) return undefined
  const ext = path.split(".").pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    sh: "bash",
    bash: "bash",
    json: "json",
    html: "html",
    css: "css",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    sql: "sql",
    rs: "rust",
    go: "go",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    hpp: "cpp",
    h: "cpp",
    c: "c",
    java: "java",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
  }
  return ext ? langMap[ext] : undefined
}

export default function ToolCall(props: ToolCallProps) {
  const { isDark } = useTheme()
  const toolCallId = () => props.toolCallId || props.toolCall?.id || ""
  const expanded = () => isToolCallExpanded(toolCallId())
  const [initializedId, setInitializedId] = createSignal<string | null>(null)

  let markdownContainerRef: HTMLDivElement | undefined

  const handleMarkdownRendered = () => {
    const id = toolCallId()
    if (!id || !markdownContainerRef) return
    restoreScrollState(id, markdownContainerRef)
  }

  createEffect(() => {
    const id = toolCallId()
    if (!id || initializedId() === id) return

    const tool = props.toolCall?.tool || ""
    const shouldExpand = tool !== "read"

    setToolCallExpanded(id, shouldExpand)
    setInitializedId(id)
  })

  // Restore scroll position when content updates
  createEffect(() => {
    const id = toolCallId()
    const element = markdownContainerRef
    if (!id || !element) return

    const tool = toolName()
    if (tool === "todowrite" || tool === "task") return

    const content = getMarkdownContent(tool, props.toolCall?.state || {})
    if (!content) return

    restoreScrollState(id, element)
  })

  // Cleanup cache entry when component unmounts or toolCallId changes
  createEffect(() => {
    const id = toolCallId()
    if (!id) return

    onCleanup(() => {
      markdownPartCache.delete(id)
      toolScrollState.delete(id)
    })
  })

  const statusIcon = () => {
    const status = props.toolCall?.state?.status || ""
    switch (status) {
      case "pending":
        return "⏸"
      case "running":
        return "⏳"
      case "completed":
        return "✓"
      case "error":
        return "✗"
      default:
        return ""
    }
  }

  const statusClass = () => {
    const status = props.toolCall?.state?.status || "pending"
    return `tool-call-status-${status}`
  }

  function toggle() {
    toggleToolCallExpanded(toolCallId())
  }

  const renderToolAction = () => {
    const toolName = props.toolCall?.tool || ""
    switch (toolName) {
      case "task":
        return "Delegating..."
      case "bash":
        return "Writing command..."
      case "edit":
        return "Preparing edit..."
      case "webfetch":
        return "Fetching from the web..."
      case "glob":
        return "Finding files..."
      case "grep":
        return "Searching content..."
      case "list":
        return "Listing directory..."
      case "read":
        return "Reading file..."
      case "write":
        return "Preparing write..."
      case "todowrite":
      case "todoread":
        return "Planning..."
      case "patch":
        return "Preparing patch..."
      default:
        return "Working..."
    }
  }

  const getTodoTitle = () => {
    const state = props.toolCall?.state || {}
    if (state.status !== "completed") return "Plan"

    const metadata = state.metadata || {}
    const todos = metadata.todos || []

    if (!Array.isArray(todos) || todos.length === 0) return "Plan"

    const counts = { pending: 0, completed: 0 }
    for (const todo of todos) {
      const status = todo.status || "pending"
      if (status in counts) counts[status as keyof typeof counts]++
    }

    const total = todos.length
    if (counts.pending === total) return "Creating plan"
    if (counts.completed === total) return "Completing plan"
    return "Updating plan"
  }

  const renderToolTitle = () => {
    const toolName = props.toolCall?.tool || ""
    const state = props.toolCall?.state || {}
    const input = state.input || {}

    if (state.status === "pending") {
      return renderToolAction()
    }

    if (state.title) {
      return state.title
    }

    const name = getToolName(toolName)

    switch (toolName) {
      case "read":
        if (input.filePath) {
          return `${name} ${getRelativePath(input.filePath)}`
        }
        return name

      case "edit":
      case "write":
        if (input.filePath) {
          return `${name} ${getRelativePath(input.filePath)}`
        }
        return name

      case "bash":
        if (input.description) {
          return `${name} ${input.description}`
        }
        return name

      case "task":
        const description = input.description
        const subagent = input.subagent_type
        if (description && subagent) {
          return `${name}[${subagent}] ${description}`
        } else if (description) {
          return `${name} ${description}`
        }
        return name

      case "webfetch":
        if (input.url) {
          return `${name} ${input.url}`
        }
        return name

      case "todowrite":
        return getTodoTitle()

      case "todoread":
        return "Plan"

      case "invalid":
        if (input.tool) {
          return getToolName(input.tool)
        }
        return name

      default:
        return name
    }
  }

  function renderToolBody() {
    const toolName = props.toolCall?.tool || ""
    const state = props.toolCall?.state || {}

    if (toolName === "todoread") {
      return null
    }

    if (state.status === "pending") {
      return null
    }

    if (toolName === "todowrite") {
      return renderTodowriteTool()
    }

    if (toolName === "task") {
      return renderTaskTool()
    }

    return renderMarkdownTool(toolName, state)
  }

  function renderMarkdownTool(toolName: string, state: any) {
    const content = getMarkdownContent(toolName, state)
    if (!content) {
      return null
    }

    const isLarge = toolName === "edit" || toolName === "write" || toolName === "patch"
    const messageClass = `message-text tool-call-markdown${isLarge ? " tool-call-markdown-large" : ""}`
    const disableHighlight = state?.status === "running"

    const cachedPart = getCachedMarkdownPart(toolCallId(), content)

    return (
      <div
        class={messageClass}
        ref={(element) => {
          markdownContainerRef = element || undefined
          const id = toolCallId()
          if (!element || !id) return

          if (!toolScrollState.has(id)) {
            requestAnimationFrame(() => {
              if (!markdownContainerRef || toolCallId() !== id) return
              markdownContainerRef.scrollTop = markdownContainerRef.scrollHeight
              updateScrollState(id, markdownContainerRef)
            })
          } else {
            restoreScrollState(id, element)
          }
        }}
        onScroll={(event) => updateScrollState(toolCallId(), event.currentTarget)}
      >
        <Markdown
          part={cachedPart}
          isDark={isDark()}
          disableHighlight={disableHighlight}
          onRendered={handleMarkdownRendered}
        />
      </div>
    )
  }

  function getMarkdownContent(toolName: string, state: any): string | null {
    const input = state?.input || {}
    const metadata = state?.metadata || {}

    switch (toolName) {
      case "read": {
        const preview = typeof metadata.preview === "string" ? metadata.preview : null
        const language = getLanguageFromPath(input.filePath || "")
        return ensureMarkdownContent(preview, language, true)
      }

      case "edit": {
        const diffText = typeof metadata.diff === "string" ? metadata.diff : null
        const fallback = typeof state.output === "string" ? state.output : null
        return ensureMarkdownContent(diffText || fallback, "diff", true)
      }

      case "write": {
        const content = typeof input.content === "string" ? input.content : null
        const metadataContent = typeof metadata.content === "string" ? metadata.content : null
        const language = getLanguageFromPath(input.filePath || "")
        return ensureMarkdownContent(content || metadataContent, language, true)
      }

      case "patch": {
        const patchContent = typeof metadata.diff === "string" ? metadata.diff : null
        const fallback = typeof state.output === "string" ? state.output : null
        return ensureMarkdownContent(patchContent || fallback, "diff", true)
      }

      case "bash": {
        const command = typeof input.command === "string" && input.command.length > 0 ? `$ ${input.command}` : ""
        const outputResult = formatUnknown(metadata.output ?? state.output)
        const parts = [command, outputResult?.text].filter(Boolean)
        const combined = parts.join("\n")
        return ensureMarkdownContent(combined, "bash", true)
      }

      case "webfetch": {
        const result = formatUnknown(state.output ?? metadata.output)
        if (!result) return null
        return ensureMarkdownContent(result.text, result.language, true)
      }

      default: {
        const result = formatUnknown(
          state.output ?? metadata.output ?? metadata.diff ?? metadata.preview ?? input.content,
        )
        if (!result) return null
        return ensureMarkdownContent(result.text, result.language, true)
      }
    }
  }

  function ensureMarkdownContent(
    value: string | null,
    language?: string,
    forceFence = false,
  ): string | null {
    if (!value) {
      return null
    }

    const trimmed = value.replace(/\s+$/, "")
    if (!trimmed) {
      return null
    }

    const startsWithFence = trimmed.trimStart().startsWith("```")
    if (startsWithFence && !forceFence) {
      return trimmed
    }

    const langSuffix = language ? language : ""
    if (language || forceFence) {
      return `\u0060\u0060\u0060${langSuffix}\n${trimmed}\n\u0060\u0060\u0060`
    }

    return trimmed
  }

  function formatUnknown(value: unknown): { text: string; language?: string } | null {
    if (value === null || value === undefined) {
      return null
    }

    if (typeof value === "string") {
      return { text: value }
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return { text: String(value) }
    }

    if (Array.isArray(value)) {
      const parts = value
        .map((item) => {
          const formatted = formatUnknown(item)
          return formatted?.text ?? ""
        })
        .filter(Boolean)

      if (parts.length === 0) {
        return null
      }

      return { text: parts.join("\n") }
    }

    if (typeof value === "object") {
      try {
        return { text: JSON.stringify(value, null, 2), language: "json" }
      } catch (error) {
        console.error("Failed to stringify tool call output", error)
        return { text: String(value) }
      }
    }

    return null
  }

  const renderTodowriteTool = () => {
    const state = props.toolCall?.state || {}
    const metadata = state.metadata || {}
    const todos = metadata.todos || []

    if (!Array.isArray(todos) || todos.length === 0) {
      return null
    }

    return (
      <div class="tool-call-todos">
        <For each={todos}>
          {(todo) => {
            const content = todo.content
            if (!content) return null

            return (
              <div class="tool-call-todo-item">
                {todo.status === "completed" && "- [x] "}
                {todo.status !== "completed" && "- [ ] "}
                {todo.status === "cancelled" && <s>{content}</s>}
                {todo.status === "in_progress" && <code>{content}</code>}
                {todo.status !== "cancelled" && todo.status !== "in_progress" && content}
              </div>
            )
          }}
        </For>
      </div>
    )
  }

  const renderTaskTool = () => {
    const state = props.toolCall?.state || {}
    const metadata = state.metadata || {}
    const summary = metadata.summary || []

    if (!Array.isArray(summary) || summary.length === 0) {
      return null
    }

    return (
      <div class="tool-call-task-summary">
        <For each={summary}>
          {(item) => {
            const tool = item.tool || "unknown"
            const itemInput = item.state?.input || {}
            const icon = getToolIcon(tool)

            let description = ""
            switch (tool) {
              case "bash":
                description = itemInput.description || itemInput.command || ""
                break
              case "edit":
              case "read":
              case "write":
                description = `${tool} ${getRelativePath(itemInput.filePath || "")}`
                break
              default:
                description = tool
            }

            return (
              <div class="tool-call-task-item">
                {icon} {description}
              </div>
            )
          }}
        </For>
      </div>
    )
  }

  const renderError = () => {
    const state = props.toolCall?.state || {}
    if (state.status === "error" && state.error) {
      return (
        <div class="tool-call-error-content">
          <strong>Error:</strong> {state.error}
        </div>
      )
    }
    return null
  }

  const toolName = () => props.toolCall?.tool || ""
  const status = () => props.toolCall?.state?.status || ""

  return (
    <div class={`tool-call ${statusClass()}`}>
      <button class="tool-call-header" onClick={toggle} aria-expanded={expanded()}>
        <span class="tool-call-icon">{expanded() ? "▼" : "▶"}</span>
        <span class="tool-call-emoji">{getToolIcon(toolName())}</span>
        <span class="tool-call-summary">{renderToolTitle()}</span>
        <span class="tool-call-status">{statusIcon()}</span>
      </button>

      <Show when={expanded()}>
        <div class="tool-call-details">
          {renderToolBody()}
          {renderError()}

          <Show when={status() === "pending"}>
            <div class="tool-call-pending-message">
              <span class="spinner-small"></span>
              <span>Waiting for permission...</span>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}
