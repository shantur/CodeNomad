export interface RenderCache {
  text: string
  html: string
  theme?: string
}

export interface MessageDisplayParts {
  text: any[]
  tool: any[]
  reasoning: any[]
  combined: any[]
  showThinking: boolean
  version: number
}

export interface Message {
  id: string
  sessionId: string
  type: "user" | "assistant"
  parts: any[]
  timestamp: number
  status: "sending" | "sent" | "streaming" | "complete" | "error"
  version: number
  displayParts?: MessageDisplayParts
}

export interface TextPart {
  id?: string
  type: "text"
  text: string
  synthetic?: boolean
  renderCache?: RenderCache
}
