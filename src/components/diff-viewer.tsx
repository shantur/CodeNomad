import { createMemo } from "solid-js"
import type { TextPart } from "../types/message"
import { Markdown } from "./markdown"
import { normalizeDiffText } from "../lib/diff-utils"
import { getToolRenderCache, setToolRenderCache } from "../lib/tool-render-cache"

type ThemeKey = "light" | "dark"

interface ToolCallDiffViewerProps {
  diffText: string
  filePath?: string
  theme: ThemeKey
  renderCacheKey?: string
}


function formatDiffMarkdown(diffText: string, filePath?: string): string {
  const body = normalizeDiffText(diffText) || diffText
  const trimmed = body.trimStart()
  const alreadyFenced = trimmed.startsWith("```")
  const fenced = alreadyFenced ? body : `\`\`\`diff\n${body}\n\`\`\``

  if (!filePath) {
    return fenced
  }
  return `### ${filePath}\n\n${fenced}`
}

export function ToolCallDiffViewer(props: ToolCallDiffViewerProps) {
  const diffMarkdown = createMemo(() => {
    return formatDiffMarkdown(props.diffText, props.filePath)
  })

  const diffPart = createMemo<TextPart>(() => {
    const part: TextPart = { type: "text", text: diffMarkdown() }
    if (props.renderCacheKey) {
      const cached = getToolRenderCache(props.renderCacheKey)
      if (cached) {
        part.renderCache = cached
      }
    }
    return part
  })

  const handleRendered = () => {
    if (!props.renderCacheKey) return
    setToolRenderCache(props.renderCacheKey, diffPart().renderCache)
  }

  return (
    <div class="tool-call-diff-viewer">
      <Markdown part={diffPart()} isDark={props.theme === "dark"} onRendered={handleRendered} />
    </div>
  )
}

