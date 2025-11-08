import type { Message } from "./message"

export interface Session {
  id: string
  instanceId: string
  title: string
  parentId: string | null
  agent: string
  model: {
    providerId: string
    modelId: string
  }
  time: {
    created: number
    updated: number
  }
  revert?: {
    messageID: string
    partID?: string
    snapshot?: string
    diff?: string
  }
  messages: Message[]
  messagesInfo: Map<string, any>
}

export interface Agent {
  name: string
  description: string
  mode: string
  model?: {
    providerId: string
    modelId: string
  }
}

export interface Provider {
  id: string
  name: string
  models: Model[]
  defaultModelId?: string
}

export interface Model {
  id: string
  name: string
  providerId: string
  limit?: {
    context?: number
    output?: number
  }
  cost?: {
    input?: number
    output?: number
  }
}
