import { Component, createSignal, Show, For, createEffect } from "solid-js"
import { Dialog } from "@kobalte/core/dialog"
import type { Session, Agent } from "../types/session"
import { getParentSessions, createSession, setActiveParentSession } from "../stores/sessions"
import { instances, stopInstance } from "../stores/instances"
import { agents } from "../stores/sessions"

interface SessionPickerProps {
  instanceId: string
  open: boolean
  onClose: () => void
}

const SessionPicker: Component<SessionPickerProps> = (props) => {
  const [selectedAgent, setSelectedAgent] = createSignal<string>("")
  const [isCreating, setIsCreating] = createSignal(false)

  const instance = () => instances().get(props.instanceId)
  const parentSessions = () => getParentSessions(props.instanceId)
  const agentList = () => agents().get(props.instanceId) || []

  createEffect(() => {
    const list = agentList()
    if (list.length > 0 && !selectedAgent()) {
      setSelectedAgent(list[0].name)
    }
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

  async function handleSessionSelect(sessionId: string) {
    setActiveParentSession(props.instanceId, sessionId)
    props.onClose()
  }

  async function handleNewSession() {
    setIsCreating(true)
    try {
      const session = await createSession(props.instanceId, selectedAgent())
      setActiveParentSession(props.instanceId, session.id)
      props.onClose()
    } catch (error) {
      console.error("Failed to create session:", error)
    } finally {
      setIsCreating(false)
    }
  }

  async function handleCancel() {
    await stopInstance(props.instanceId)
    props.onClose()
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay class="modal-overlay" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="modal-surface w-full max-w-lg p-6">
            <Dialog.Title class="text-xl font-semibold text-primary mb-4">
              OpenCode • {instance()?.folder.split("/").pop()}
            </Dialog.Title>

            <div class="space-y-6">
              <Show
                when={parentSessions().length > 0}
                fallback={<div class="text-center py-4 text-sm text-muted">No previous sessions</div>}
              >
                <div>
                  <h3 class="text-sm font-medium text-secondary mb-2">
                    Resume a session ({parentSessions().length}):
                  </h3>
                  <div class="space-y-1 max-h-[400px] overflow-y-auto">
                    <For each={parentSessions()}>
                      {(session) => (
                        <button
                          type="button"
                          class="selector-option w-full text-left"
                          onClick={() => handleSessionSelect(session.id)}
                        >
                          <div class="selector-option-content">
                            <span class="selector-option-label truncate">
                              {session.title || "Untitled"}
                            </span>
                          </div>
                          <span class="selector-badge-time flex-shrink-0">
                            {formatRelativeTime(session.time.updated)}
                          </span>
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Show>

              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-base" />
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-2 bg-surface-base text-muted">or</span>
                </div>
              </div>

              <div>
                <h3 class="text-sm font-medium text-secondary mb-2">Start new session:</h3>
                <div class="space-y-3">
                  <Show
                    when={agentList().length > 0}
                    fallback={<div class="text-sm text-muted">Loading agents...</div>}
                  >
                    <select
                      class="selector-input w-full"
                      value={selectedAgent()}
                      onChange={(e) => setSelectedAgent(e.currentTarget.value)}
                    >
                      <For each={agentList()}>{(agent) => <option value={agent.name}>{agent.name}</option>}</For>
                    </select>
                  </Show>

                  <button
                    class="selector-button selector-button-primary w-full"
                    onClick={handleNewSession}
                    disabled={isCreating() || agentList().length === 0}
                  >
                    {isCreating() ? "Creating..." : "Start"}
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-6 flex justify-end">
              <button
                type="button"
                class="selector-button selector-button-secondary"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  )
}

export default SessionPicker
