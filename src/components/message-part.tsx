import { Show, Match, Switch } from "solid-js"
import ToolCall from "./tool-call"
import { isItemExpanded, toggleItemExpanded } from "../stores/tool-call-state"
import { Markdown } from "./markdown"
import { useTheme } from "../lib/theme"
import { preferences } from "../stores/preferences"
import { partHasRenderableText } from "../types/message"

interface MessagePartProps {
  part: any
  messageType?: "user" | "assistant"
}
export default function MessagePart(props: MessagePartProps) {
  const { isDark } = useTheme()
  const partType = () => props.part?.type || ""
  const reasoningId = () => `reasoning-${props.part?.id || ""}`
  const isReasoningExpanded = () => isItemExpanded(reasoningId())
  const isAssistantMessage = () => props.messageType === "assistant"
  const textContainerClass = () => (isAssistantMessage() ? "message-text message-text-assistant" : "message-text")

  function handleReasoningClick(e: Event) {
    e.preventDefault()
    toggleItemExpanded(reasoningId())
  }

  return (
    <Switch>
      <Match when={partType() === "text"}>
        <Show when={!props.part.synthetic && partHasRenderableText(props.part)}>
          <div class={textContainerClass()}>
            <Markdown part={props.part} isDark={isDark()} size={isAssistantMessage() ? "tight" : "base"} />
          </div>
        </Show>
      </Match>

      <Match when={partType() === "tool"}>
        <ToolCall toolCall={props.part} toolCallId={props.part?.id} />
      </Match>

      <Match when={partType() === "error"}>
        <div class="message-error-part">⚠ {props.part.message}</div>
      </Match>

      <Match when={partType() === "reasoning"}>
        <Show when={preferences().showThinkingBlocks && partHasRenderableText(props.part)}>
          <div class="message-reasoning">
            <div class="reasoning-container">
              <div class="reasoning-header" onClick={handleReasoningClick}>
                <span class="reasoning-icon">{isReasoningExpanded() ? "▼" : "▶"}</span>
                <span class="reasoning-label">Reasoning</span>
              </div>
              <Show when={isReasoningExpanded()}>
                <div class={`${textContainerClass()} mt-2`}>
                  <Markdown part={props.part} isDark={isDark()} size={isAssistantMessage() ? "tight" : "base"} />
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </Match>
    </Switch>
  )
}
