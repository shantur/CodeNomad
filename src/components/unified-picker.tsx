import { Component, createSignal, createEffect, For, Show, onCleanup } from "solid-js"
import type { Agent } from "../types/session"

interface FileItem {
  path: string
  added?: number
  removed?: number
  isGitFile: boolean
}

type PickerItem = { type: "agent"; agent: Agent } | { type: "file"; file: FileItem }

interface UnifiedPickerProps {
  open: boolean
  onSelect: (item: PickerItem) => void
  onClose: () => void
  agents: Agent[]
  instanceClient: any
  searchQuery: string
  textareaRef?: HTMLTextAreaElement
  workspaceFolder: string
}

const UnifiedPicker: Component<UnifiedPickerProps> = (props) => {
  const [files, setFiles] = createSignal<FileItem[]>([])
  const [filteredAgents, setFilteredAgents] = createSignal<Agent[]>([])
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [loading, setLoading] = createSignal(false)
  const [allFiles, setAllFiles] = createSignal<FileItem[]>([])
  const [isInitialized, setIsInitialized] = createSignal(false)

  let containerRef: HTMLDivElement | undefined
  let scrollContainerRef: HTMLDivElement | undefined

  async function fetchFiles(searchQuery: string) {
    setLoading(true)

    try {
      if (allFiles().length === 0) {
        const scannedPaths = await window.electronAPI.scanDirectory(props.workspaceFolder)
        const scannedFiles: FileItem[] = scannedPaths.map((path) => ({
          path,
          isGitFile: false,
        }))
        setAllFiles(scannedFiles)
      }

      const filteredFiles = searchQuery.trim()
        ? allFiles().filter((f) => f.path.toLowerCase().includes(searchQuery.toLowerCase()))
        : allFiles()

      setFiles(filteredFiles)
      setSelectedIndex(0)

      setTimeout(() => {
        if (scrollContainerRef) {
          scrollContainerRef.scrollTop = 0
        }
      }, 0)
    } catch (error) {
      console.error(`[UnifiedPicker] Failed to fetch files:`, error)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  let lastQuery = ""

  createEffect(() => {
    if (props.open && !isInitialized()) {
      setIsInitialized(true)
      fetchFiles(props.searchQuery)
      lastQuery = props.searchQuery
      return
    }

    if (props.open && props.searchQuery !== lastQuery) {
      lastQuery = props.searchQuery
      fetchFiles(props.searchQuery)
    }
  })

  createEffect(() => {
    if (!props.open) return

    const query = props.searchQuery.toLowerCase()
    const filtered = query
      ? props.agents.filter(
          (agent) =>
            agent.name.toLowerCase().includes(query) ||
            (agent.description && agent.description.toLowerCase().includes(query)),
        )
      : props.agents

    setFilteredAgents(filtered)
  })

  const allItems = (): PickerItem[] => {
    const items: PickerItem[] = []
    filteredAgents().forEach((agent) => items.push({ type: "agent", agent }))
    files().forEach((file) => items.push({ type: "file", file }))
    return items
  }

  function scrollToSelected() {
    setTimeout(() => {
      const selectedElement = containerRef?.querySelector('[data-picker-selected="true"]')
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" })
      }
    }, 0)
  }

  function handleSelect(item: PickerItem) {
    props.onSelect(item)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!props.open) return

    const items = allItems()

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1))
      scrollToSelected()
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
      scrollToSelected()
    } else if (e.key === "Enter") {
      e.preventDefault()
      const selected = items[selectedIndex()]
      if (selected) {
        handleSelect(selected)
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      props.onClose()
    }
  }

  createEffect(() => {
    if (props.open) {
      document.addEventListener("keydown", handleKeyDown)
      onCleanup(() => {
        document.removeEventListener("keydown", handleKeyDown)
      })
    }
  })

  const agentCount = () => filteredAgents().length
  const fileCount = () => files().length

  return (
    <Show when={props.open}>
      <div
        ref={containerRef}
        class="absolute bottom-full left-0 mb-1 w-full max-w-md rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800 z-50"
      >
        <div class="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
          <div class="text-xs font-medium text-gray-500 dark:text-gray-400">
            Select Agent or File
            <Show when={loading()}>
              <span class="ml-2">Loading...</span>
            </Show>
          </div>
        </div>

        <div ref={scrollContainerRef} class="max-h-60 overflow-y-auto">
          <Show when={agentCount() === 0 && fileCount() === 0}>
            <div class="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No results found</div>
          </Show>

          <Show when={agentCount() > 0}>
            <div class="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">
              AGENTS
            </div>
            <For each={filteredAgents()}>
              {(agent) => {
                const itemIndex = allItems().findIndex(
                  (item) => item.type === "agent" && item.agent.name === agent.name,
                )
                return (
                  <div
                    class={`cursor-pointer px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      itemIndex === selectedIndex() ? "bg-blue-50 dark:bg-blue-900/20" : ""
                    }`}
                    data-picker-selected={itemIndex === selectedIndex()}
                    onClick={() => handleSelect({ type: "agent", agent })}
                  >
                    <div class="flex items-start gap-2">
                      <svg
                        class="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <div class="flex-1">
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{agent.name}</span>
                          <Show when={agent.mode === "subagent"}>
                            <span class="rounded bg-blue-50 px-1.5 py-0.5 text-xs font-normal text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                              subagent
                            </span>
                          </Show>
                        </div>
                        <Show when={agent.description}>
                          <div class="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                            {agent.description && agent.description.length > 80
                              ? agent.description.slice(0, 80) + "..."
                              : agent.description}
                          </div>
                        </Show>
                      </div>
                    </div>
                  </div>
                )
              }}
            </For>
          </Show>

          <Show when={fileCount() > 0}>
            <div class="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">
              FILES
            </div>
            <For each={files()}>
              {(file) => {
                const itemIndex = allItems().findIndex((item) => item.type === "file" && item.file.path === file.path)
                const isFolder = file.path.endsWith("/")
                return (
                  <div
                    class={`cursor-pointer px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      itemIndex === selectedIndex() ? "bg-blue-50 dark:bg-blue-900/20" : ""
                    }`}
                    data-picker-selected={itemIndex === selectedIndex()}
                    onClick={() => handleSelect({ type: "file", file })}
                  >
                    <div class="flex items-center gap-2 text-sm">
                      <Show
                        when={isFolder}
                        fallback={
                          <svg class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        }
                      >
                        <svg class="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                          />
                        </svg>
                      </Show>
                      <span class="text-gray-900 dark:text-gray-100 truncate">{file.path}</span>
                    </div>
                  </div>
                )
              }}
            </For>
          </Show>
        </div>

        <div class="border-t border-gray-200 px-3 py-2 dark:border-gray-700">
          <div class="text-xs text-gray-500 dark:text-gray-400">
            <span class="font-medium">↑↓</span> navigate • <span class="font-medium">Enter</span> select •{" "}
            <span class="font-medium">Esc</span> close
          </div>
        </div>
      </div>
    </Show>
  )
}

export default UnifiedPicker
