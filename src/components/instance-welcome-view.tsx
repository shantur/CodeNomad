import { Component, createSignal, Show, For, createEffect, onMount, onCleanup } from "solid-js"
import type { Instance } from "../types/instance"
import { getParentSessions, createSession, setActiveParentSession, agents } from "../stores/sessions"
import InstanceInfo from "./instance-info"

interface InstanceWelcomeViewProps {
  instance: Instance
}

const InstanceWelcomeView: Component<InstanceWelcomeViewProps> = (props) => {
  const [selectedAgent, setSelectedAgent] = createSignal<string>("")
  const [isCreating, setIsCreating] = createSignal(false)
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [focusMode, setFocusMode] = createSignal<"sessions" | "new-session" | null>("sessions")

  const parentSessions = () => getParentSessions(props.instance.id)
  const agentList = () => agents().get(props.instance.id) || []

  createEffect(() => {
    const list = agentList()
    if (list.length > 0 && !selectedAgent()) {
      setSelectedAgent(list[0].name)
    }
  })

  createEffect(() => {
    const sessions = parentSessions()
    if (sessions.length === 0) {
      setFocusMode("new-session")
      setSelectedIndex(0)
    } else {
      setFocusMode("sessions")
      setSelectedIndex(0)
    }
  })

  function scrollToIndex(index: number) {
    const element = document.querySelector(`[data-session-index="${index}"]`)
    if (element) {
      element.scrollIntoView({ block: "nearest", behavior: "auto" })
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    const sessions = parentSessions()

    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleNewSession()
      return
    }

    if (sessions.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      const newIndex = Math.min(selectedIndex() + 1, sessions.length - 1)
      setSelectedIndex(newIndex)
      setFocusMode("sessions")
      scrollToIndex(newIndex)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      const newIndex = Math.max(selectedIndex() - 1, 0)
      setSelectedIndex(newIndex)
      setFocusMode("sessions")
      scrollToIndex(newIndex)
    } else if (e.key === "PageDown") {
      e.preventDefault()
      const pageSize = 5
      const newIndex = Math.min(selectedIndex() + pageSize, sessions.length - 1)
      setSelectedIndex(newIndex)
      setFocusMode("sessions")
      scrollToIndex(newIndex)
    } else if (e.key === "PageUp") {
      e.preventDefault()
      const pageSize = 5
      const newIndex = Math.max(selectedIndex() - pageSize, 0)
      setSelectedIndex(newIndex)
      setFocusMode("sessions")
      scrollToIndex(newIndex)
    } else if (e.key === "Home") {
      e.preventDefault()
      setSelectedIndex(0)
      setFocusMode("sessions")
      scrollToIndex(0)
    } else if (e.key === "End") {
      e.preventDefault()
      const newIndex = sessions.length - 1
      setSelectedIndex(newIndex)
      setFocusMode("sessions")
      scrollToIndex(newIndex)
    } else if (e.key === "Enter") {
      e.preventDefault()
      handleEnterKey()
    }
  }

  async function handleEnterKey() {
    const sessions = parentSessions()
    const index = selectedIndex()

    if (index < sessions.length) {
      await handleSessionSelect(sessions[index].id)
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown)
    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown)
    })
  })

  function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return "just now"
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString()
  }

  async function handleSessionSelect(sessionId: string) {
    setActiveParentSession(props.instance.id, sessionId)
  }

  async function handleNewSession() {
    if (isCreating() || agentList().length === 0) return

    setIsCreating(true)
    try {
      const session = await createSession(props.instance.id, selectedAgent())
      setActiveParentSession(props.instance.id, session.id)
    } catch (error) {
      console.error("Failed to create session:", error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div class="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div class="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-auto">
        <div class="flex-1 flex flex-col gap-4 min-h-0">
          <Show
            when={parentSessions().length > 0}
            fallback={
              <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center flex-shrink-0">
                <div class="text-gray-400 mb-2">
                  <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p class="text-gray-600 font-medium text-sm">No Previous Sessions</p>
                <p class="text-xs text-gray-500">Create a new session below to get started</p>
              </div>
            }
          >
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
              <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 class="text-base font-semibold text-gray-900">Resume Session</h2>
                <p class="text-xs text-gray-500 mt-0.5">
                  {parentSessions().length} {parentSessions().length === 1 ? "session" : "sessions"} available
                </p>
              </div>
              <div class="max-h-[400px] overflow-y-auto">
                <For each={parentSessions()}>
                  {(session, index) => (
                    <button
                      data-session-index={index()}
                      class="w-full text-left px-4 py-2.5 border-b border-gray-100 hover:bg-blue-50 transition-all group focus:outline-none"
                      classList={{
                        "bg-blue-100 ring-2 ring-blue-500 ring-inset":
                          focusMode() === "sessions" && selectedIndex() === index(),
                        "hover:bg-blue-50": focusMode() !== "sessions" || selectedIndex() !== index(),
                      }}
                      onClick={() => handleSessionSelect(session.id)}
                      onMouseEnter={() => {
                        setFocusMode("sessions")
                        setSelectedIndex(index())
                      }}
                    >
                      <div class="flex items-center justify-between gap-3">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <span
                              class="text-sm font-medium text-gray-900 group-hover:text-blue-700 truncate"
                              classList={{
                                "text-blue-700": focusMode() === "sessions" && selectedIndex() === index(),
                              }}
                            >
                              {session.title || "Untitled Session"}
                            </span>
                          </div>
                          <div class="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span>{session.agent}</span>
                            <span>•</span>
                            <span>{formatRelativeTime(session.time.updated)}</span>
                          </div>
                        </div>
                        <Show when={focusMode() === "sessions" && selectedIndex() === index()}>
                          <kbd class="px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded flex-shrink-0">
                            ↵
                          </kbd>
                        </Show>
                      </div>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
            <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h2 class="text-base font-semibold text-gray-900">Start New Session</h2>
              <p class="text-xs text-gray-500 mt-0.5">Create a fresh conversation with your chosen agent</p>
            </div>
            <div class="p-4">
              <Show when={agentList().length > 0} fallback={<div class="text-sm text-gray-500">Loading agents...</div>}>
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1.5">Agent</label>
                    <select
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      value={selectedAgent()}
                      onChange={(e) => setSelectedAgent(e.currentTarget.value)}
                    >
                      <For each={agentList()}>
                        {(agent) => (
                          <option value={agent.name}>
                            {agent.name}
                            {agent.description ? ` - ${agent.description}` : ""}
                          </option>
                        )}
                      </For>
                    </select>
                  </div>

                  <button
                    class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-between text-sm relative group"
                    onClick={handleNewSession}
                    disabled={isCreating() || agentList().length === 0}
                  >
                    <Show
                      when={!isCreating()}
                      fallback={
                        <>
                          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                            <path
                              class="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Creating...
                        </>
                      }
                    >
                      <div class="flex items-center gap-2 flex-1 justify-center">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Create Session</span>
                      </div>
                      <kbd class="px-1.5 py-0.5 text-xs font-semibold bg-blue-700 border border-blue-500 rounded flex-shrink-0">
                        Cmd+Enter
                      </kbd>
                    </Show>
                  </button>
                </div>
              </Show>
            </div>
          </div>
        </div>

        <div class="lg:w-80 flex-shrink-0">
          <div class="sticky top-0">
            <InstanceInfo instance={props.instance} />
          </div>
        </div>
      </div>

      <div class="px-4 py-2 bg-white border-t border-gray-200 flex-shrink-0">
        <div class="flex items-center justify-center flex-wrap gap-3 text-xs text-gray-500">
          <div class="flex items-center gap-1.5">
            <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-xs">↑</kbd>
            <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-xs">↓</kbd>
            <span>Navigate</span>
          </div>
          <div class="flex items-center gap-1.5">
            <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-xs">PgUp</kbd>
            <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-xs">PgDn</kbd>
            <span>Jump</span>
          </div>
          <div class="flex items-center gap-1.5">
            <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-xs">Home</kbd>
            <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-xs">End</kbd>
            <span>First/Last</span>
          </div>
          <div class="flex items-center gap-1.5">
            <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-xs">Enter</kbd>
            <span>Resume</span>
          </div>
          <div class="flex items-center gap-1.5">
            <kbd class="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Cmd+Enter</kbd>
            <span>New Session</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InstanceWelcomeView
