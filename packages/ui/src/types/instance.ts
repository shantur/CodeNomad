import type { OpencodeClient } from "@opencode-ai/sdk/client"
import type { LspStatus, Project as SDKProject } from "@opencode-ai/sdk"

export interface LogEntry {
  timestamp: number
  level: "info" | "error" | "warn" | "debug"
  message: string
}

// Use SDK Project type instead of our own
export type ProjectInfo = SDKProject

export interface McpServerStatus {
  name: string
  status: "running" | "stopped" | "error"
}

// Raw MCP status from server (SDK returns unknown for /mcp endpoint)
export type RawMcpStatus = Record<string, {
  status?: string
  error?: string
}>

export interface InstanceMetadata {
  project?: ProjectInfo
  mcpStatus?: RawMcpStatus
  lspStatus?: LspStatus[]
  version?: string
}

export interface Instance {
  id: string
  folder: string
  port: number
  pid: number
  proxyPath: string
  status: "starting" | "ready" | "error" | "stopped"
  error?: string
  client: OpencodeClient | null
  metadata?: InstanceMetadata
  binaryPath?: string
  environmentVariables?: Record<string, string>
}
