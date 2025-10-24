import { Component, Show } from "solid-js"
import type { Session } from "../types/session"
import { MessageSquare, Info, X } from "lucide-solid"

interface SessionTabProps {
  session?: Session
  special?: "info"
  active: boolean
  isParent?: boolean
  onSelect: () => void
  onClose?: () => void
}

const SessionTab: Component<SessionTabProps> = (props) => {
  const label = () => {
    if (props.special === "info") return "Info"
    return props.session?.title || "Untitled"
  }

  return (
    <div class="session-tab-container group">
      <button
        class={`session-tab inline-flex items-center gap-2 px-3 py-1.5 rounded-t-md max-w-[150px] transition-colors text-sm ${
          props.active
            ? "bg-white dark:bg-gray-800 border-b-2 border-blue-500 font-medium text-gray-900 dark:text-gray-100"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        } ${props.special === "info" ? "text-gray-500 dark:text-gray-400" : ""} ${props.isParent && !props.active ? "font-semibold" : ""}`}
        onClick={props.onSelect}
        title={label()}
        role="tab"
        aria-selected={props.active}
      >
        <Show when={props.special === "info"} fallback={<MessageSquare class="w-3.5 h-3.5 flex-shrink-0" />}>
          <Info class="w-3.5 h-3.5 flex-shrink-0" />
        </Show>
        <span class="tab-label truncate">{label()}</span>
        <Show when={!props.special && props.onClose}>
          <span
            class="tab-close opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white rounded p-0.5 transition-opacity cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              props.onClose?.()
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
  )
}

export default SessionTab
