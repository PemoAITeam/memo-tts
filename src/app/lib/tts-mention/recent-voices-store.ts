import type { SelectedVoiceConfig } from './types'

const STORAGE_KEY = 'tts-recent-voices'
const MAX_RECENT_PER_PLUGIN = 3
const MAX_RECENT_SHORTCUTS = 5

export interface RecentVoiceEntry {
  pluginId: string
  config: SelectedVoiceConfig
  timestamp: number
}

type RecentVoicesListener = () => void

class RecentVoicesStore {
  private entries: Map<string, RecentVoiceEntry[]> = new Map()
  private listeners = new Set<RecentVoicesListener>()

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        return
      }

      const data = JSON.parse(stored) as Record<string, RecentVoiceEntry[] | RecentVoiceEntry | undefined>
      const normalizedEntries = Object.entries(data)
        .map(([pluginId, value]) => {
          const voices = Array.isArray(value)
            ? value
            : value
              ? [value]
              : []

          return [pluginId, voices.slice(0, MAX_RECENT_PER_PLUGIN)] as const
        })
        .filter(([, voices]) => voices.length > 0)

      this.entries = new Map(normalizedEntries)
    } catch (error) {
      console.warn('[RecentVoicesStore] Failed to load from storage:', error)
      this.entries = new Map()
    }
  }

  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.entries)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.warn('[RecentVoicesStore] Failed to save to storage:', error)
    }
  }

  private emitChange() {
    this.listeners.forEach((listener) => listener())
  }

  subscribe(listener: RecentVoicesListener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getRecentVoices(pluginId: string): RecentVoiceEntry[] {
    return (this.entries.get(pluginId) || []).slice(0, MAX_RECENT_PER_PLUGIN)
  }

  getMostRecentVoice(pluginId: string): RecentVoiceEntry | undefined {
    return this.getRecentVoices(pluginId)[0]
  }

  getAllMostRecentVoices(): RecentVoiceEntry[] {
    return Array.from(this.entries.values())
      .flatMap((voices) => voices.slice(0, MAX_RECENT_PER_PLUGIN))
      .filter((entry): entry is RecentVoiceEntry => !!entry)
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, MAX_RECENT_SHORTCUTS)
  }

  addRecentVoice(config: SelectedVoiceConfig) {
    if (!config.pluginId) {
      return
    }

    const pluginId = config.pluginId
    const existing = this.entries.get(pluginId) || []
    const configKey = this.getConfigKey(config)
    const filtered = existing.filter((entry) => this.getConfigKey(entry.config) !== configKey)

    const nextEntry: RecentVoiceEntry = {
      pluginId,
      config,
      timestamp: Date.now(),
    }

    this.entries.set(pluginId, [nextEntry, ...filtered].slice(0, MAX_RECENT_PER_PLUGIN))
    this.saveToStorage()
    this.emitChange()
  }

  clearRecentVoices(pluginId: string) {
    this.entries.delete(pluginId)
    this.saveToStorage()
    this.emitChange()
  }

  clearAll() {
    this.entries.clear()
    this.saveToStorage()
    this.emitChange()
  }

  private getConfigKey(config: SelectedVoiceConfig): string {
    return JSON.stringify({
      provider: config.provider,
      lang: config.lang,
      scene: config.scene,
      model: config.model,
      voice: config.voice,
      voiceName: config.voiceName,
      voiceType: config.voiceType,
    })
  }
}

export const recentVoicesStore = new RecentVoicesStore()
