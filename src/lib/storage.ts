import type { Preferences, RecentFolder, OpenCodeBinary } from "../stores/preferences"

export interface ConfigData {
  preferences: Preferences
  recentFolders: RecentFolder[]
  opencodeBinaries: OpenCodeBinary[]
}

export interface InstanceData {
  messageHistory: string[]
}

export class FileStorage {
  private configPath: string | undefined
  private instancesDir: string | undefined
  private configChangeListeners: Set<() => void> = new Set()
  private initialized = false

  constructor() {
    this.initialize()
  }

  private async initialize() {
    if (this.initialized) return

    this.configPath = await window.electronAPI.getConfigPath()
    this.instancesDir = await window.electronAPI.getInstancesDir()

    // Listen for config changes from other instances
    window.electronAPI.onConfigChanged(() => {
      this.configChangeListeners.forEach((listener) => listener())
    })

    this.initialized = true
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  private parseConfig(content: string): ConfigData {
    const trimmed = content.trim()

    try {
      return JSON.parse(trimmed)
    } catch (error) {
      const firstBrace = trimmed.indexOf("{")
      const lastBrace = trimmed.lastIndexOf("}")

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const sanitized = trimmed.slice(firstBrace, lastBrace + 1)

        if (sanitized.length !== trimmed.length) {
          console.warn("Config file contained trailing data; attempting recovery")
        }

        try {
          return JSON.parse(sanitized)
        } catch {
          // Fall through to rethrow original error below
        }
      }

      throw error
    }
  }

  // Config operations
  async loadConfig(): Promise<ConfigData> {
    await this.ensureInitialized()
    try {
      const content = await window.electronAPI.readConfigFile()
      return this.parseConfig(content)
    } catch (error) {
      console.warn("Failed to load config, using defaults:", error)
      return {
        preferences: {
          showThinkingBlocks: false,
          environmentVariables: {},
          modelRecents: [],
          agentModelSelections: {},
          diffViewMode: "split",
        },
        recentFolders: [],
        opencodeBinaries: [],
      }
    }
  }

  async saveConfig(config: ConfigData): Promise<void> {
    await this.ensureInitialized()
    try {
      await window.electronAPI.writeConfigFile(JSON.stringify(config, null, 2))
    } catch (error) {
      console.error("Failed to save config:", error)
      throw error
    }
  }

  // Instance operations
  async loadInstanceData(instanceId: string): Promise<InstanceData> {
    await this.ensureInitialized()
    try {
      const filename = this.instanceIdToFilename(instanceId)
      const content = await window.electronAPI.readInstanceFile(filename)
      return JSON.parse(content)
    } catch (error) {
      console.warn(`Failed to load instance data for ${instanceId}, using defaults:`, error)
      return {
        messageHistory: [],
      }
    }
  }

  async saveInstanceData(instanceId: string, data: InstanceData): Promise<void> {
    await this.ensureInitialized()
    try {
      const filename = this.instanceIdToFilename(instanceId)
      await window.electronAPI.writeInstanceFile(filename, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error(`Failed to save instance data for ${instanceId}:`, error)
      throw error
    }
  }

  async deleteInstanceData(instanceId: string): Promise<void> {
    await this.ensureInitialized()
    try {
      const filename = this.instanceIdToFilename(instanceId)
      await window.electronAPI.deleteInstanceFile(filename)
    } catch (error) {
      console.error(`Failed to delete instance data for ${instanceId}:`, error)
      throw error
    }
  }

  // Convert folder path to safe filename
  private instanceIdToFilename(instanceId: string): string {
    // Convert folder path to safe filename
    // Replace path separators and other invalid characters
    return instanceId
      .replace(/[\\/]/g, "_") // Replace path separators
      .replace(/[^a-zA-Z0-9_.-]/g, "_") // Replace other invalid chars
      .replace(/_{2,}/g, "_") // Replace multiple underscores with single
      .replace(/^_|_$/g, "") // Remove leading/trailing underscores
      .toLowerCase()
  }

  // Config change listeners
  onConfigChanged(listener: () => void): () => void {
    this.configChangeListeners.add(listener)
    return () => this.configChangeListeners.delete(listener)
  }
}

// Singleton instance
export const storage = new FileStorage()
