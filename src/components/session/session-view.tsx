import { Show, createMemo, createEffect, onCleanup, type Component } from "solid-js"
import type { Session } from "../../types/session"
import type { Attachment } from "../../types/attachment"
import type { ClientPart } from "../../types/message"
import MessageStream from "../message-stream"
import PromptInput from "../prompt-input"
import { instances } from "../../stores/instances"
import { loadMessages, sendMessage, forkSession, isSessionMessagesLoading, setActiveParentSession, setActiveSession, runShellCommand } from "../../stores/sessions"

interface SessionViewProps {
  sessionId: string
  activeSessions: Map<string, Session>
  instanceId: string
  instanceFolder: string
  escapeInDebounce: boolean
}

export const SessionView: Component<SessionViewProps> = (props) => {
  const session = () => props.activeSessions.get(props.sessionId)
  const messagesLoading = createMemo(() => isSessionMessagesLoading(props.instanceId, props.sessionId))

  createEffect(() => {
    const currentSession = session()
    if (currentSession) {
      loadMessages(props.instanceId, currentSession.id).catch(console.error)
    }
  })

  async function handleSendMessage(prompt: string, attachments: Attachment[]) {
    await sendMessage(props.instanceId, props.sessionId, prompt, attachments)
  }

  async function handleRunShell(command: string) {
    await runShellCommand(props.instanceId, props.sessionId, command)
  }

  function getUserMessageText(messageId: string): string | null {
    const currentSession = session()
    if (!currentSession) return null

    const targetMessage = currentSession.messages.find((m) => m.id === messageId)
    const targetInfo = currentSession.messagesInfo.get(messageId)
    if (!targetMessage || targetInfo?.role !== "user") {
      return null
    }

    const textParts = targetMessage.parts.filter((p): p is ClientPart & { type: "text"; text: string } => p.type === "text")
    if (textParts.length === 0) {
      return null
    }

    return textParts.map((p) => p.text).join("\n")
  }

  async function handleRevert(messageId: string) {
    const instance = instances().get(props.instanceId)
    if (!instance || !instance.client) return

    try {
      await instance.client.session.revert({
        path: { id: props.sessionId },
        body: { messageID: messageId },
      })

      const restoredText = getUserMessageText(messageId)
      if (restoredText) {
        const textarea = document.querySelector(".prompt-input") as HTMLTextAreaElement
        if (textarea) {
          textarea.value = restoredText
          textarea.dispatchEvent(new Event("input", { bubbles: true }))
          textarea.focus()
        }
      }
    } catch (error) {
      console.error("Failed to revert:", error)
      alert("Failed to revert to message")
    }
  }

  async function handleFork(messageId?: string) {
    if (!messageId) {
      console.warn("Fork requires a user message id")
      return
    }

    const restoredText = getUserMessageText(messageId)

    try {
      const forkedSession = await forkSession(props.instanceId, props.sessionId, { messageId })

      const parentToActivate = forkedSession.parentId ?? forkedSession.id
      setActiveParentSession(props.instanceId, parentToActivate)
      if (forkedSession.parentId) {
        setActiveSession(props.instanceId, forkedSession.id)
      }

      await loadMessages(props.instanceId, forkedSession.id).catch(console.error)

      if (restoredText) {
        const textarea = document.querySelector(".prompt-input") as HTMLTextAreaElement
        if (textarea) {
          textarea.value = restoredText
          textarea.dispatchEvent(new Event("input", { bubbles: true }))
          textarea.focus()
        }
      }
    } catch (error) {
      console.error("Failed to fork session:", error)
      alert("Failed to fork session")
    }
  }


  return (
    <Show
      when={session()}
      fallback={
        <div class="flex items-center justify-center h-full">
          <div class="text-center text-gray-500">Session not found</div>
        </div>
      }
    >
      {(s) => (
        <div class="session-view">
          <MessageStream
            instanceId={props.instanceId}
            sessionId={s().id}
            messages={s().messages || []}
            messagesInfo={s().messagesInfo}
            revert={s().revert}
            loading={messagesLoading()}
            onRevert={handleRevert}
            onFork={handleFork}
          />

          <PromptInput
            instanceId={props.instanceId}
            instanceFolder={props.instanceFolder}
            sessionId={s().id}
            onSend={handleSendMessage}
            onRunShell={handleRunShell}
            escapeInDebounce={props.escapeInDebounce}
          />
        </div>
      )}
    </Show>
  )
}

export default SessionView
