import { Mark } from '@tiptap/react'
import type { MemoTTSEditorRole } from '@/app/lib/tts-plugin'

export interface TTSMarkOptions {
  HTMLAttributes: Record<string, any>,
}

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    ttsMark: {
      setTTSMark: (attributes: {
        config?: Record<string, any> | null
        speed?: number | null
        emotion?: string | null
      }) => ReturnType,
      toggleTTSMark: (attributes: {
        config?: Record<string, any> | null
        speed?: number | null
        emotion?: string | null
      }) => ReturnType,
      unsetTTSMark: () => ReturnType,
    }
  }
}

export const SPEED_LABEL_MAP: Record<number, string> = {
  0.5: 'very slow',
  0.75: 'slow',
  1: '',
  1.25: 'slightly fast',
  1.5: 'fast',
  2: 'very fast',
}

export const EMOTION_LABEL_MAP: Record<string, string> = {
  none: '',
  happy: 'happy',
  sad: 'sad',
  angry: 'angry',
  surprise: 'surprised',
  customer_service: 'customer service',
  pleased: 'pleased',
  narrative: 'narrative',
  news: 'news',
  gossip: 'gossip',
  documentary: 'documentary',
  drama: 'drama',
  ads: 'ads',
  poetry: 'poetry',
  storytelling: 'storytelling',
}

export function getSpeedLabel(speed: number | null | undefined): string {
  if (speed === null || speed === undefined || speed === 1) return ''
  return SPEED_LABEL_MAP[speed] || `${speed}x`
}

export function getEmotionLabel(emotion: string | null | undefined): string {
  if (!emotion || emotion === 'none') return ''
  return EMOTION_LABEL_MAP[emotion] || emotion
}

function stableSerializeConfig(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerializeConfig(item)).join(',')}]`
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, itemValue]) => itemValue !== undefined && itemValue !== null && itemValue !== '')
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, itemValue]) => `${JSON.stringify(key)}:${stableSerializeConfig(itemValue)}`)

    return `{${entries.join(',')}}`
  }

  return JSON.stringify(value)
}

export function normalizeTTSMarkConfig(value: unknown): Record<string, any> | null {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return normalizeTTSMarkConfig(parsed)
    } catch (error) {
      console.warn('Failed to parse ttsMark config:', error)
      return null
    }
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const normalized = Object.fromEntries(
    Object.entries(value as Record<string, any>).filter(([, itemValue]) => itemValue !== undefined && itemValue !== null && itemValue !== '')
  )

  return Object.keys(normalized).length ? normalized : null
}

export function buildTTSMarkAttributesFromConfig(
  config: Record<string, any> | null | undefined,
  editorFields?: Partial<Record<MemoTTSEditorRole, string>>
) {
  const normalizedConfig = normalizeTTSMarkConfig(config)

  if (!normalizedConfig) {
    return {
      config: null,
      speed: null,
      emotion: null,
    }
  }

  const speedFieldKey = editorFields?.speed
  const emotionFieldKey = editorFields?.emotion
  const speedValue = speedFieldKey ? normalizedConfig[speedFieldKey] : undefined
  const emotionValue = emotionFieldKey ? normalizedConfig[emotionFieldKey] : undefined

  return {
    config: normalizedConfig,
    speed: typeof speedValue === 'number' && speedValue !== 1 ? speedValue : null,
    emotion: typeof emotionValue === 'string' && emotionValue !== 'none' ? emotionValue : null,
  }
}

export function getTTSMarkConfigFromAttributes(
  attributes: Record<string, any> | null | undefined,
  editorFields?: Partial<Record<MemoTTSEditorRole, string>>
) {
  const normalizedConfig = {
    ...(normalizeTTSMarkConfig(attributes?.config) || {}),
  }

  const speedFieldKey = editorFields?.speed
  if (
    speedFieldKey
    && attributes?.speed !== undefined
    && attributes?.speed !== null
    && normalizedConfig[speedFieldKey] === undefined
  ) {
    normalizedConfig[speedFieldKey] = attributes.speed
  }

  const emotionFieldKey = editorFields?.emotion
  if (
    emotionFieldKey
    && attributes?.emotion !== undefined
    && attributes?.emotion !== null
    && attributes?.emotion !== 'none'
    && normalizedConfig[emotionFieldKey] === undefined
  ) {
    normalizedConfig[emotionFieldKey] = attributes.emotion
  }

  return Object.keys(normalizedConfig).length ? normalizedConfig : null
}

export const TTSMark = Mark.create<TTSMarkOptions>({
  name: 'ttsMark',

  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      config: {
        default: null,
        parseHTML: (element: HTMLElement) => normalizeTTSMarkConfig(element.getAttribute('data-config')),
        renderHTML: (attributes: Record<string, any>) => {
          const config = normalizeTTSMarkConfig(attributes.config)
          if (!config) return {}
          return { 'data-config': stableSerializeConfig(config) }
        },
      },
      speed: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const speed = element.getAttribute('data-speed')
          return speed ? parseFloat(speed) : null
        },
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.speed || attributes.speed === 1) return {}
          return { 'data-speed': attributes.speed }
        },
      },
      emotion: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-emotion'),
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.emotion || attributes.emotion === 'none') return {}
          return { 'data-emotion': attributes.emotion }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-tts-mark]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    const speed = HTMLAttributes['data-speed']
    const emotion = HTMLAttributes['data-emotion']
    const labelParts: string[] = []

    const emotionLabel = getEmotionLabel(emotion)
    if (emotionLabel) {
      labelParts.push(emotionLabel)
    }

    const speedLabel = getSpeedLabel(speed)
    if (speedLabel) {
      labelParts.push(speedLabel)
    }

    const hasLabel = labelParts.length > 0
    const label = labelParts.join(' ')

    return [
      'span',
      {
        ...this.options.HTMLAttributes,
        ...HTMLAttributes,
        'data-tts-mark': '',
        'data-label': hasLabel ? `[${label}]` : undefined,
        class: `tts-mark${hasLabel ? ' tts-mark--has-label' : ''}`,
      },
      0,
    ]
  },

  addCommands() {
    return {
      setTTSMark:
        (attributes: { config?: Record<string, any> | null; speed?: number | null; emotion?: string | null }) =>
        ({ commands }: { commands: any }) => {
          return commands.setMark(this.name, attributes)
        },
      toggleTTSMark:
        (attributes: { config?: Record<string, any> | null; speed?: number | null; emotion?: string | null }) =>
        ({ commands }: { commands: any }) => {
          return commands.toggleMark(this.name, attributes)
        },
      unsetTTSMark:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.unsetMark(this.name)
        },
    }
  },
})

export const TTS_SPEED_OPTIONS = [
  { value: 0.5, label: 'Very slow', description: '0.5x' },
  { value: 0.75, label: 'Slow', description: '0.75x' },
  { value: 1, label: 'Normal', description: '1x (default)' },
  { value: 1.25, label: 'Slightly fast', description: '1.25x' },
  { value: 1.5, label: 'Fast', description: '1.5x' },
  { value: 2, label: 'Very fast', description: '2x' },
]

export interface EmotionOption {
  value: string
  label: string
}
