import { createStore, produce, reconcile } from "solid-js/store"
import type { SetStoreFunction } from "solid-js/store"
import type { ClientPart, MessageInfo } from "../../types/message"
import type {
  InstanceMessageState,
  MessageRecord,
  MessageUpsertInput,
  PartUpdateInput,
  PendingPartEntry,
  PermissionEntry,
  ReplaceMessageIdOptions,
  ScrollSnapshot,
  SessionRecord,
  SessionUpsertInput,
  SessionUsageState,
  UsageEntry,
} from "./types"

function createInitialState(instanceId: string): InstanceMessageState {
  return {
    instanceId,
    sessions: {},
    sessionOrder: [],
    messages: {},
    messageInfo: {},
    pendingParts: {},
    permissions: {
      queue: [],
      active: null,
      byMessage: {},
    },
    usage: {},
    scrollState: {},
  }
}

function ensurePartId(messageId: string, part: ClientPart, index: number): string {
  if (typeof part.id === "string" && part.id.length > 0) {
    return part.id
  }
  return `${messageId}-part-${index}`
}

function clonePart(part: ClientPart): ClientPart {
  return JSON.parse(JSON.stringify(part)) as ClientPart
}

function createEmptyUsageState(): SessionUsageState {
  return {
    entries: {},
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalReasoningTokens: 0,
    totalCost: 0,
    actualUsageTokens: 0,
    latestMessageId: undefined,
  }
}

function extractUsageEntry(info: MessageInfo | undefined): UsageEntry | null {
  if (!info || info.role !== "assistant") return null
  const messageId = typeof info.id === "string" ? info.id : undefined
  if (!messageId) return null
  const tokens = info.tokens
  if (!tokens) return null
  const inputTokens = tokens.input ?? 0
  const outputTokens = tokens.output ?? 0
  const reasoningTokens = tokens.reasoning ?? 0
  const cacheReadTokens = tokens.cache?.read ?? 0
  const cacheWriteTokens = tokens.cache?.write ?? 0
  if (inputTokens === 0 && outputTokens === 0 && reasoningTokens === 0 && cacheReadTokens === 0 && cacheWriteTokens === 0) {
    return null
  }
  const combinedTokens = info.summary ? outputTokens : inputTokens + cacheReadTokens + cacheWriteTokens + outputTokens + reasoningTokens
  return {
    messageId,
    inputTokens,
    outputTokens,
    reasoningTokens,
    cacheReadTokens,
    cacheWriteTokens,
    combinedTokens,
    cost: info.cost ?? 0,
    timestamp: info.time?.created ?? 0,
    hasContextUsage: inputTokens + cacheReadTokens + cacheWriteTokens > 0,
  }
}

function applyUsageState(state: SessionUsageState, entry: UsageEntry | null) {
  if (!entry) return
  state.entries[entry.messageId] = entry
  state.totalInputTokens += entry.inputTokens
  state.totalOutputTokens += entry.outputTokens
  state.totalReasoningTokens += entry.reasoningTokens
  state.totalCost += entry.cost
  if (!state.latestMessageId || entry.timestamp >= (state.entries[state.latestMessageId]?.timestamp ?? 0)) {
    state.latestMessageId = entry.messageId
    state.actualUsageTokens = entry.combinedTokens
  }
}

function removeUsageEntry(state: SessionUsageState, messageId: string | undefined) {
  if (!messageId) return
  const existing = state.entries[messageId]
  if (!existing) return
  state.totalInputTokens -= existing.inputTokens
  state.totalOutputTokens -= existing.outputTokens
  state.totalReasoningTokens -= existing.reasoningTokens
  state.totalCost -= existing.cost
  delete state.entries[messageId]
  if (state.latestMessageId === messageId) {
    state.latestMessageId = undefined
    state.actualUsageTokens = 0
    let latest: UsageEntry | null = null
    for (const candidate of Object.values(state.entries) as UsageEntry[]) {
      if (!latest || candidate.timestamp >= latest.timestamp) {
        latest = candidate
      }
    }
    if (latest) {
      state.latestMessageId = latest.messageId
      state.actualUsageTokens = latest.combinedTokens
    }
  }
}

function rebuildUsageStateFromInfos(infos: Iterable<MessageInfo>): SessionUsageState {
  const usageState = createEmptyUsageState()
  for (const info of infos) {
    const entry = extractUsageEntry(info)
    if (entry) {
      applyUsageState(usageState, entry)
    }
  }
  return usageState
}

export interface InstanceMessageStore {

  instanceId: string
  state: InstanceMessageState
  setState: SetStoreFunction<InstanceMessageState>
  addOrUpdateSession: (input: SessionUpsertInput) => void
  upsertMessage: (input: MessageUpsertInput) => void
  applyPartUpdate: (input: PartUpdateInput) => void
  bufferPendingPart: (entry: PendingPartEntry) => void
  flushPendingParts: (messageId: string) => void
  replaceMessageId: (options: ReplaceMessageIdOptions) => void
  setMessageInfo: (messageId: string, info: MessageInfo) => void
  getMessageInfo: (messageId: string) => MessageInfo | undefined
  upsertPermission: (entry: PermissionEntry) => void
  removePermission: (permissionId: string) => void
  getPermissionState: (messageId?: string, partId?: string) => { entry: PermissionEntry; active: boolean } | null
  setSessionRevert: (sessionId: string, revert?: SessionRecord["revert"] | null) => void
  getSessionRevert: (sessionId: string) => SessionRecord["revert"] | undefined | null
  rebuildUsage: (sessionId: string, infos: Iterable<MessageInfo>) => void
  getSessionUsage: (sessionId: string) => SessionUsageState | undefined
  setScrollSnapshot: (sessionId: string, scope: string, snapshot: Omit<ScrollSnapshot, "updatedAt">) => void
  getScrollSnapshot: (sessionId: string, scope: string) => ScrollSnapshot | undefined
  getSessionMessageIds: (sessionId: string) => string[]
  getMessage: (messageId: string) => MessageRecord | undefined
  clearInstance: () => void
}

export function createInstanceMessageStore(instanceId: string): InstanceMessageStore {
  const [state, setState] = createStore<InstanceMessageState>(createInitialState(instanceId))

  function withUsageState(sessionId: string, updater: (draft: SessionUsageState) => void) {
    setState("usage", sessionId, (current) => {
      const draft = current
        ? {
            ...current,
            entries: { ...current.entries },
          }
        : createEmptyUsageState()
      updater(draft)
      return draft
    })
  }

  function updateUsageWithInfo(info: MessageInfo | undefined) {
    if (!info || typeof info.sessionID !== "string") return
    const messageId = typeof info.id === "string" ? info.id : undefined
    if (!messageId) return
    withUsageState(info.sessionID, (draft) => {
      removeUsageEntry(draft, messageId)
      const entry = extractUsageEntry(info)
      if (entry) {
        applyUsageState(draft, entry)
      }
    })
  }

  function rebuildUsage(sessionId: string, infos: Iterable<MessageInfo>) {
    const usageState = rebuildUsageStateFromInfos(infos)
    setState("usage", sessionId, usageState)
  }

  function getSessionUsage(sessionId: string) {
    return state.usage[sessionId]
  }

  function ensureSessionEntry(sessionId: string): SessionRecord {
    const existing = state.sessions[sessionId]
    if (existing) {
      return existing
    }

    const now = Date.now()
    const session: SessionRecord = {
      id: sessionId,
      createdAt: now,
      updatedAt: now,
      messageIds: [],
    }

    setState("sessions", sessionId, session)
    setState("sessionOrder", (order) => (order.includes(sessionId) ? order : [...order, sessionId]))
    return session
  }

  function addOrUpdateSession(input: SessionUpsertInput) {
    const session = ensureSessionEntry(input.id)
    const nextMessageIds = Array.isArray(input.messageIds) ? input.messageIds : session.messageIds

    setState("sessions", input.id, {
      ...session,
      title: input.title ?? session.title,
      parentId: input.parentId ?? session.parentId ?? null,
      updatedAt: Date.now(),
      messageIds: nextMessageIds,
      revert: input.revert ?? session.revert ?? null,
    })
  }

  function insertMessageIntoSession(sessionId: string, messageId: string) {
    ensureSessionEntry(sessionId)
    setState("sessions", sessionId, "messageIds", (ids = []) => {
      if (ids.includes(messageId)) {
        return ids
      }
      return [...ids, messageId]
    })
  }

  function normalizeParts(messageId: string, parts: ClientPart[] | undefined) {
    if (!parts || parts.length === 0) {
      return null
    }
    const map: MessageRecord["parts"] = {}
    const ids: string[] = []

    parts.forEach((part, index) => {
      const id = ensurePartId(messageId, part, index)
      const cloned = clonePart(part)
      if (typeof cloned.version !== "number") {
        cloned.version = 0
      }
      map[id] = {
        id,
        data: cloned,
        revision: cloned.version,
      }
      ids.push(id)
    })

    return { map, ids }
  }

  function upsertMessage(input: MessageUpsertInput) {
    const normalizedParts = normalizeParts(input.id, input.parts)
    const shouldBump = Boolean(input.bumpRevision || normalizedParts)
    const now = Date.now()

    setState("messages", input.id, (previous) => {
      const revision = previous ? previous.revision + (shouldBump ? 1 : 0) : 0
      return {
        id: input.id,
        sessionId: input.sessionId,
        role: input.role,
        status: input.status,
        createdAt: input.createdAt ?? previous?.createdAt ?? now,
        updatedAt: input.updatedAt ?? now,
        isEphemeral: input.isEphemeral ?? previous?.isEphemeral ?? false,
        revision,
        partIds: normalizedParts ? normalizedParts.ids : previous?.partIds ?? [],
        parts: normalizedParts ? normalizedParts.map : previous?.parts ?? {},
      }
    })

    insertMessageIntoSession(input.sessionId, input.id)
    flushPendingParts(input.id)
  }

  function bufferPendingPart(entry: PendingPartEntry) {
    setState("pendingParts", entry.messageId, (list = []) => [...list, entry])
  }

  function applyPartUpdate(input: PartUpdateInput) {
    const message = state.messages[input.messageId]
    if (!message) {
      bufferPendingPart({ messageId: input.messageId, part: input.part, receivedAt: Date.now() })
      return
    }

    const partId = ensurePartId(input.messageId, input.part, message.partIds.length)
    const cloned = clonePart(input.part)

    setState(
      "messages",
      input.messageId,
      produce((draft: MessageRecord) => {
        if (!draft.partIds.includes(partId)) {
          draft.partIds = [...draft.partIds, partId]
        }
        const existing = draft.parts[partId]
        const nextRevision = existing ? existing.revision + 1 : cloned.version ?? 0
        draft.parts[partId] = {
          id: partId,
          data: cloned,
          revision: nextRevision,
        }
        draft.updatedAt = Date.now()
        if (input.bumpRevision ?? true) {
          draft.revision += 1
        }
      }),
    )
  }

  function flushPendingParts(messageId: string) {
    const pending = state.pendingParts[messageId]
    if (!pending || pending.length === 0) {
      return
    }
    pending.forEach((entry) => applyPartUpdate({ messageId, part: entry.part }))
    setState("pendingParts", (prev) => {
      const next = { ...prev }
      delete next[messageId]
      return next
    })
  }

  function replaceMessageId(options: ReplaceMessageIdOptions) {
    if (options.oldId === options.newId) return
    const existing = state.messages[options.oldId]
    if (!existing) return

    const cloned: MessageRecord = {
      ...existing,
      id: options.newId,
      isEphemeral: false,
      updatedAt: Date.now(),
    }

    setState("messages", options.newId, cloned)
    setState("messages", (prev) => {
      const next = { ...prev }
      delete next[options.oldId]
      return next
    })

    Object.values(state.sessions).forEach((session) => {
      const index = session.messageIds.indexOf(options.oldId)
      if (index === -1) return
      setState("sessions", session.id, "messageIds", (ids) => {
        const next = [...ids]
        next[index] = options.newId
        return next
      })
    })

    const infoEntry = state.messageInfo[options.oldId]
    if (infoEntry) {
      setState("messageInfo", options.newId, infoEntry)
      setState("messageInfo", (prev) => {
        const next = { ...prev }
        delete next[options.oldId]
        return next
      })
    }

    const permissionMap = state.permissions.byMessage[options.oldId]
    if (permissionMap) {
      setState("permissions", "byMessage", options.newId, permissionMap)
      setState("permissions", (prev) => {
        const next = { ...prev }
        const nextByMessage = { ...next.byMessage }
        delete nextByMessage[options.oldId]
        next.byMessage = nextByMessage
        return next
      })
    }

    const pending = state.pendingParts[options.oldId]
    if (pending) {
      setState("pendingParts", options.newId, pending)
      setState("pendingParts", (prev) => {
        const next = { ...prev }
        delete next[options.oldId]
        return next
      })
    }
  }

  function setMessageInfo(messageId: string, info: MessageInfo) {
    if (!messageId) return
    setState("messageInfo", messageId, info)
    updateUsageWithInfo(info)
  }

  function getMessageInfo(messageId: string) {
    return state.messageInfo[messageId]
  }

  function upsertPermission(entry: PermissionEntry) {
    const messageKey = entry.messageId ?? "__global__"
    const partKey = entry.partId ?? "__global__"

    setState(
      "permissions",
      produce((draft) => {
        draft.byMessage[messageKey] = draft.byMessage[messageKey] ?? {}
        draft.byMessage[messageKey][partKey] = entry
        const existingIndex = draft.queue.findIndex((item) => item.permission.id === entry.permission.id)
        if (existingIndex === -1) {
          draft.queue.push(entry)
        } else {
          draft.queue[existingIndex] = entry
        }
        if (!draft.active || draft.active.permission.id === entry.permission.id) {
          draft.active = entry
        }
      }),
    )
  }

  function removePermission(permissionId: string) {
    setState(
      "permissions",
      produce((draft) => {
        draft.queue = draft.queue.filter((item) => item.permission.id !== permissionId)
        if (draft.active?.permission.id === permissionId) {
          draft.active = draft.queue[0] ?? null
        }
        Object.keys(draft.byMessage).forEach((messageKey) => {
          const partEntries = draft.byMessage[messageKey]
          Object.keys(partEntries).forEach((partKey) => {
            if (partEntries[partKey].permission.id === permissionId) {
              delete partEntries[partKey]
            }
          })
          if (Object.keys(partEntries).length === 0) {
            delete draft.byMessage[messageKey]
          }
        })
      }),
    )
  }

  function getPermissionState(messageId?: string, partId?: string) {
    const messageKey = messageId ?? "__global__"
    const partKey = partId ?? "__global__"
    const entry = state.permissions.byMessage[messageKey]?.[partKey]
    if (!entry) return null
    const active = state.permissions.active?.permission.id === entry.permission.id
    return { entry, active }
  }

  function setSessionRevert(sessionId: string, revert?: SessionRecord["revert"] | null) {
    if (!sessionId) return
    ensureSessionEntry(sessionId)
    setState("sessions", sessionId, "revert", revert ?? null)
  }

  function getSessionRevert(sessionId: string) {
    return state.sessions[sessionId]?.revert ?? null
  }

  function makeScrollKey(sessionId: string, scope: string) {
    return `${sessionId}:${scope}`
  }

  function setScrollSnapshot(sessionId: string, scope: string, snapshot: Omit<ScrollSnapshot, "updatedAt">) {
    const key = makeScrollKey(sessionId, scope)
    setState("scrollState", key, { ...snapshot, updatedAt: Date.now() })
  }

  function getScrollSnapshot(sessionId: string, scope: string) {
    const key = makeScrollKey(sessionId, scope)
    return state.scrollState[key]
  }

  function clearInstance() {
    setState(reconcile(createInitialState(instanceId)))
  }

  return {
    instanceId,
    state,
    setState,
    addOrUpdateSession,
    upsertMessage,
    applyPartUpdate,
    bufferPendingPart,
    flushPendingParts,
    replaceMessageId,
    setMessageInfo,
    getMessageInfo,
    upsertPermission,
    removePermission,
    getPermissionState,
    setSessionRevert,
    getSessionRevert,
    rebuildUsage,
    getSessionUsage,
    setScrollSnapshot,
    getScrollSnapshot,
    getSessionMessageIds: (sessionId: string) => state.sessions[sessionId]?.messageIds ?? [],
    getMessage: (messageId: string) => state.messages[messageId],
    clearInstance,
  }
}
