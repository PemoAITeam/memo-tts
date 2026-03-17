/**
 * TTS Mark Extension
 * 用于包裹选中文本，添加速度和情绪属性
 * 在文本末尾显示标签（如「开心地」「快速地」）
 */

import { Mark } from '@tiptap/react'

export interface TTSMarkOptions {
  HTMLAttributes: Record<string, any>,
}

declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    ttsMark: {
      /**
       * 设置 TTS 标记
       */
      setTTSMark: (attributes: { speed?: number; emotion?: string }) => ReturnType,
      /**
       * 切换 TTS 标记
       */
      toggleTTSMark: (attributes: { speed?: number; emotion?: string }) => ReturnType,
      /**
       * 移除 TTS 标记
       */
      unsetTTSMark: () => ReturnType,
    }
  }
}

// 速度到中文副词的映射
export const SPEED_LABEL_MAP: Record<number, string> = {
  0.5: '非常慢地',
  0.75: '缓慢地',
  1: '', // 默认速度，不显示
  1.25: '稍快地',
  1.5: '快速地',
  2: '非常快地',
}

// 情绪值到中文的映射
export const EMOTION_LABEL_MAP: Record<string, string> = {
  none: '',
  // 通用情绪
  happy: '开心地',
  sad: '悲伤地',
  angry: '愤怒地',
  surprise: '惊讶地',
  // 火山引擎特有
  customer_service: '客服腔',
  pleased: '愉悦地',
  narrative: '叙述地',
  news: '新闻腔',
  gossip: '八卦地',
  documentary: '纪录片腔',
  drama: '戏剧地',
  ads: '广告腔',
  poetry: '诗意地',
  storytelling: '讲故事地',
}

// 获取速度标签
export function getSpeedLabel(speed: number | null | undefined): string {
  if (speed === null || speed === undefined || speed === 1) return ''
  return SPEED_LABEL_MAP[speed] || `${speed}x`
}

// 获取情绪标签
export function getEmotionLabel(emotion: string | null | undefined): string {
  if (!emotion || emotion === 'none') return ''
  return EMOTION_LABEL_MAP[emotion] || emotion
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

    // 构建标签文字
    const labelParts: string[] = []

    // 情绪在前
    const emotionLabel = getEmotionLabel(emotion)
    if (emotionLabel) {
      labelParts.push(emotionLabel)
    }

    // 速度在后
    const speedLabel = getSpeedLabel(speed)
    if (speedLabel) {
      labelParts.push(speedLabel)
    }

    const hasLabel = labelParts.length > 0
    const label = labelParts.join('，')

    return [
      'span',
      {
        ...this.options.HTMLAttributes,
        ...HTMLAttributes,
        'data-tts-mark': '',
        'data-label': hasLabel ? label : undefined,
        class: `tts-mark${hasLabel ? ' tts-mark--has-label' : ''}`,
      },
      0, // 内容插槽
    ]
  },

  addCommands() {
    return {
      setTTSMark:
        (attributes: { speed?: number; emotion?: string }) =>
        ({ commands }: { commands: any }) => {
          return commands.setMark(this.name, attributes)
        },
      toggleTTSMark:
        (attributes: { speed?: number; emotion?: string }) =>
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

  addKeyboardShortcuts() {
    return {
      // 可以添加快捷键
    }
  },
})

// 速度选项（用于菜单显示）
export const TTS_SPEED_OPTIONS = [
  { value: 0.5, label: '非常慢', description: '0.5x' },
  { value: 0.75, label: '缓慢', description: '0.75x' },
  { value: 1, label: '正常', description: '1x（默认）' },
  { value: 1.25, label: '稍快', description: '1.25x' },
  { value: 1.5, label: '快速', description: '1.5x' },
  { value: 2, label: '非常快', description: '2x' },
]

// 情绪选项类型
export interface EmotionOption {
  value: string
  label: string
}
