import type { OpencodeClient } from "@opencode-ai/sdk/client"

export interface LogEntry {
  timestamp: number
  level: "info" | "error" | "warn" | "debug"
  message: string
}

export interface ProjectInfo {
  id: string
  worktree: string
  vcs?: "git"
  time: {
    created: number
    initialized?: number
  }
}

export interface McpServerStatus {
  name: string
  status: "running" | "stopped" | "error"
}

export interface InstanceMetadata {
  project?: ProjectInfo
  mcpStatus?: unknown
  version?: string
}

export interface Instance {
  id: string
  folder: string
  port: number
  pid: number
  status: "starting" | "ready" | "error" | "stopped"
  error?: string
  client: OpencodeClient | null
  logs: LogEntry[]
  metadata?: InstanceMetadata
  binaryPath?: string
  environmentVariables?: Record<string, string>
}
