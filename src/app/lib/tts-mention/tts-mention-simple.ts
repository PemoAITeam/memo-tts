/**
 * TTS Mention Extension - 简化版
 * 不依赖 @tiptap/suggestion 和 tippy.js
 */

import { Extension, Node } from '@tiptap/react'
import { SelectedVoiceConfig, MenuPath, TTSMenuItem, TTSProvider } from './types'
import { buildVoiceBadgeSeed, getVoiceBadgeColors } from '@/app/lib/voice-badge-colors'
import {
  createTTSMentionPlugin,
  selectVoice,
  closeMentionMenu,
  isMentionMenuActive,
  getCurrentQuery,
  getCurrentRange,
} from './tts-mention-plugin'

// 导出工具函数
export { selectVoice, closeMentionMenu, isMentionMenuActive, getCurrentQuery, getCurrentRange }

function buildMentionInlineStyle(attributes: Record<string, any>) {
  const seed = buildVoiceBadgeSeed([
    attributes['data-provider'],
    attributes['data-config'],
    attributes['data-label'],
  ])
  const { backgroundColor, foregroundColor } = getVoiceBadgeColors(seed)
  const existingStyle = String(attributes.style || '').trim()
  const nextStyle = `background-color: ${backgroundColor}; color: ${foregroundColor};`
  const normalizedExistingStyle = existingStyle && !existingStyle.endsWith(';')
    ? `${existingStyle};`
    : existingStyle

  return normalizedExistingStyle ? `${normalizedExistingStyle} ${nextStyle}` : nextStyle
}

// Inline Node 类型，用于 @ 语音标签
export const TTSMentionNode = Node.create({
  name: 'ttsMention',

  group: 'inline',

  inline: true,

  atom: true, // 原子节点，不可编辑内部内容

  addAttributes() {
    return {
      provider: {
        default: null,
        parseHTML: element => element.getAttribute('data-provider'),
        renderHTML: attributes => {
          if (!attributes.provider) return {}
          return { 'data-provider': attributes.provider }
        },
      },
      config: {
        default: null,
        parseHTML: element => element.getAttribute('data-config'),
        renderHTML: attributes => {
          if (!attributes.config) return {}
          return { 'data-config': attributes.config }
        },
      },
      label: {
        default: '',
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          if (!attributes.label) return {}
          return { 'data-label': attributes.label }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-tts-mention]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      {
        ...HTMLAttributes,
        'data-tts-mention': '',
        class: 'tts-mention',
        style: buildMentionInlineStyle(HTMLAttributes),
      },
      ['span', { class: 'tts-mention-label' }, `@${HTMLAttributes['data-label'] || ''}`],
    ]
  },
})

// 保留 Mark 以兼容旧数据（可选）
export const TTSMentionMark = Node.create({
  name: 'ttsMentionMark',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      provider: {
        default: null,
        parseHTML: element => element.getAttribute('data-provider'),
        renderHTML: attributes => {
          if (!attributes.provider) return {}
          return { 'data-provider': attributes.provider }
        },
      },
      config: {
        default: null,
        parseHTML: element => element.getAttribute('data-config'),
        renderHTML: attributes => {
          if (!attributes.config) return {}
          return { 'data-config': attributes.config }
        },
      },
    }
  },

  parseHTML() {
    return []
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0]
  },
})

// 扩展选项
export interface TTSMentionSimpleOptions {
  char: string
  onMenuOpen?: (props: { range: { from: number; to: number }; query: string }) => void
  onMenuClose?: () => void
  onVoiceSelect?: (config: SelectedVoiceConfig) => void
}

// 主扩展
export const TTSMentionSimple = Extension.create<TTSMentionSimpleOptions>({
  name: 'ttsMentionSimple',

  priority: 100,

  addOptions() {
    return {
      char: '@',
      onMenuOpen: undefined,
      onMenuClose: undefined,
      onVoiceSelect: undefined,
    }
  },

  addProseMirrorPlugins() {
    const { onMenuOpen, onMenuClose } = this.options

    return [
      createTTSMentionPlugin({
        char: this.options.char,
        onOpen: (props) => {
          onMenuOpen?.(props)
        },
        onClose: () => {
          onMenuClose?.()
        },
        onSelect: (config) => {
          selectVoice(this.editor, config)
          this.options.onVoiceSelect?.(config)
        },
      }),
    ]
  },
})

// 类型导出
export type { SelectedVoiceConfig, MenuPath, TTSMenuItem, TTSProvider }
