import type { RenderCache } from "../types/message"

const toolRenderCache = new Map<string, RenderCache>()

export function getToolRenderCache(key?: string | null): RenderCache | undefined {
  if (!key) return undefined
  return toolRenderCache.get(key)
}

export function setToolRenderCache(key: string | undefined | null, cache?: RenderCache): void {
  if (!key) return
  if (cache) {
    toolRenderCache.set(key, cache)
  } else {
    toolRenderCache.delete(key)
  }
}

export function clearToolRenderCache(key?: string | null): void {
  if (!key) return
  toolRenderCache.delete(key)
}
