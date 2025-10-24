import { For, Show, createSignal, createEffect, createMemo } from "solid-js"
import type { Message } from "../types/message"
import MessageItem from "./message-item"
import ToolCall from "./tool-call"
import { sseManager } from "../lib/sse-manager"
import Kbd from "./kbd"

interface MessageStreamProps {
  instanceId: string
  sessionId: string
  messages: Message[]
  messagesInfo?: Map<string, any>
  revert?: {
    messageID: string
    partID?: string
    snapshot?: string
    diff?: string
  }
  loading?: boolean
  onRevert?: (messageId: string) => void
}

interface DisplayItem {
  type: "message" | "tool"
  data: any
  messageInfo?: any
}

export default function MessageStream(props: MessageStreamProps) {
  let containerRef: HTMLDivElement | undefined
  const [autoScroll, setAutoScroll] = createSignal(true)
  const [showScrollButton, setShowScrollButton] = createSignal(false)

  const connectionStatus = () => sseManager.getStatus(props.instanceId)

  function scrollToBottom() {
    if (containerRef) {
      containerRef.scrollTop = containerRef.scrollHeight
      setAutoScroll(true)
      setShowScrollButton(false)
    }
  }

  function handleScroll() {
    if (!containerRef) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50

    setAutoScroll(isAtBottom)
    setShowScrollButton(!isAtBottom)
  }

  const displayItems = createMemo(() => {
    const items: DisplayItem[] = []

    let lastAssistantMessageId = ""
    for (let i = props.messages.length - 1; i >= 0; i--) {
      if (props.messages[i].type === "assistant") {
        lastAssistantMessageId = props.messages[i].id
        break
      }
    }

    for (const message of props.messages) {
      const messageInfo = props.messagesInfo?.get(message.id)

      // If we hit the revert point, stop rendering messages
      if (props.revert?.messageID && message.id === props.revert.messageID) {
        break
      }

      const textParts = message.parts.filter((p) => p.type === "text" && !p.synthetic)
      const toolParts = message.parts.filter((p) => p.type === "tool")
      const reasoningParts = message.parts.filter((p) => p.type === "reasoning")

      const isQueued = message.type === "user" && message.id > lastAssistantMessageId

      if (textParts.length > 0 || reasoningParts.length > 0 || messageInfo?.error) {
        items.push({
          type: "message",
          data: {
            ...message,
            parts: [...textParts, ...reasoningParts],
            isQueued,
          },
          messageInfo,
        })
      }

      for (const toolPart of toolParts) {
        items.push({
          type: "tool",
          data: toolPart,
          messageInfo,
        })
      }
    }

    return items
  })

  const itemsLength = () => displayItems().length
  createEffect(() => {
    itemsLength()
    if (autoScroll()) {
      setTimeout(scrollToBottom, 0)
    }
  })

  return (
    <div class="message-stream-container">
      <div class="connection-status">
        <div class="flex-1" />
        <div class="flex items-center gap-2 text-sm font-medium text-gray-700">
          <span>Command Palette</span>
          <Kbd shortcut="cmd+shift+p" />
        </div>
        <div class="flex-1 flex items-center justify-end gap-3">
          <Show when={connectionStatus() === "connected"}>
            <span class="status-indicator connected">
              <span class="status-dot" />
              Connected
            </span>
          </Show>
          <Show when={connectionStatus() === "connecting"}>
            <span class="status-indicator connecting">
              <span class="status-dot" />
              Connecting...
            </span>
          </Show>
          <Show when={connectionStatus() === "error" || connectionStatus() === "disconnected"}>
            <span class="status-indicator disconnected">
              <span class="status-dot" />
              Disconnected
            </span>
          </Show>
        </div>
      </div>
      <div ref={containerRef} class="message-stream" onScroll={handleScroll}>
        <Show when={!props.loading && displayItems().length === 0}>
          <div class="empty-state">
            <div class="empty-state-content">
              <h3>Start a conversation</h3>
              <p>Type a message below or try:</p>
              <ul>
                <li>
                  <code>/init-project</code>
                </li>
                <li>Ask about your codebase</li>
                <li>
                  Attach files with <code>@</code>
                </li>
              </ul>
            </div>
          </div>
        </Show>

        <Show when={props.loading}>
          <div class="loading-state">
            <div class="spinner" />
            <p>Loading messages...</p>
          </div>
        </Show>

        <For each={displayItems()} fallback={null}>
          {(item, index) => {
            const key = item.type === "message" ? `msg-${item.data.id}` : `tool-${item.data.id}`
            return (
              <Show
                when={item.type === "message"}
                fallback={
                  <div class="tool-call-message" data-key={key}>
                    <div class="tool-call-header-label">
                      <span class="tool-call-icon">🔧</span>
                      <span>Tool Call</span>
                      <span class="tool-name">{item.data?.tool || "unknown"}</span>
                    </div>
                    <ToolCall toolCall={item.data} toolCallId={item.data.id} />
                  </div>
                }
              >
                <MessageItem
                  message={item.data}
                  messageInfo={item.messageInfo}
                  isQueued={item.data.isQueued}
                  onRevert={props.onRevert}
                />
              </Show>
            )
          }}
        </For>
      </div>

      <Show when={showScrollButton()}>
        <button class="scroll-to-bottom" onClick={scrollToBottom} aria-label="Scroll to bottom">
          ↓
        </button>
      </Show>
    </div>
  )
}
