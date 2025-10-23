export interface Attachment {
  id: string
  type: AttachmentType
  display: string
  url: string
  filename: string
  mediaType: string
  source: AttachmentSource
}

export type AttachmentType = "file" | "text" | "symbol" | "agent"

export type AttachmentSource = FileSource | TextSource | SymbolSource | AgentSource

export interface FileSource {
  type: "file"
  path: string
  mime: string
  data?: Uint8Array
}

export interface TextSource {
  type: "text"
  value: string
}

export interface SymbolSource {
  type: "symbol"
  path: string
  name: string
  kind: number
  range: SymbolRange
}

export interface SymbolRange {
  start: Position
  end: Position
}

export interface Position {
  line: number
  char: number
}

export interface AgentSource {
  type: "agent"
  name: string
}

export function createFileAttachment(
  path: string,
  filename: string,
  mime: string = "text/plain",
  data?: Uint8Array,
): Attachment {
  return {
    id: crypto.randomUUID(),
    type: "file",
    display: `@${filename}`,
    url: path,
    filename,
    mediaType: mime,
    source: {
      type: "file",
      path: path,
      mime,
      data,
    },
  }
}

export function createTextAttachment(value: string, display: string, filename: string): Attachment {
  const base64 = btoa(value)
  return {
    id: crypto.randomUUID(),
    type: "text",
    display,
    url: `data:text/plain;base64,${base64}`,
    filename,
    mediaType: "text/plain",
    source: {
      type: "text",
      value,
    },
  }
}
