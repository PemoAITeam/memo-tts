/**
 * TTS Speed Extension
 * 用于 / 菜单插入速度和情绪控制块
 */

import { Node, Extension } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { VolcanoSceneEmotion, ScenesType } from '../volcano.config'

export const TTSSpeedPluginKey = new PluginKey('ttsSpeed')

// 速度选项（子菜单）
export const SPEED_SUB_OPTIONS = [
  { id: 'speed-0.5', label: '0.5x', value: 0.5, description: '很慢' },
  { id: 'speed-0.75', label: '0.75x', value: 0.75, description: '较慢' },
  { id: 'speed-1', label: '1x', value: 1, description: '正常' },
  { id: 'speed-1.25', label: '1.25x', value: 1.25, description: '较快' },
  { id: 'speed-1.5', label: '1.5x', value: 1.5, description: '快' },
  { id: 'speed-2', label: '2x', value: 2, description: '很快' },
]

// 菜单项类型
export type SpeedMenuItemType = 'speedEntry' | 'emotionEntry' | 'speed' | 'emotion'

export interface SpeedMenuItem {
  id: string
  type: SpeedMenuItemType
  label: string
  value?: number | string
  description?: string
  icon?: string
}

// 获取第一级菜单项（速度入口 + 情绪入口）
export function getSpeedMenuLevel1(): SpeedMenuItem[] {
  return [
    // 速度入口
    { id: 'speed-entry', type: 'speedEntry', label: '速度', icon: 'speed' },
    // 情绪入口
    { id: 'emotion-entry', type: 'emotionEntry', label: '情绪', icon: 'emotion' },
  ]
}

// 获取情绪子菜单项
export function getEmotionSubMenu(provider?: string, scene?: ScenesType): SpeedMenuItem[] {
  // 火山引擎场景情绪
  if (provider === 'Volcano' && scene && VolcanoSceneEmotion[scene]) {
    return VolcanoSceneEmotion[scene].map((e: { label: string; value: string }) => ({
      id: `emotion-${e.value}`,
      type: 'emotion' as const,
      label: e.label,
      value: e.value,
    }))
  }

  // 默认情绪列表
  const defaultEmotions = [
    { label: '无', value: 'none' },
    { label: '开心', value: 'happy' },
    { label: '悲伤', value: 'sad' },
    { label: '愤怒', value: 'angry' },
    { label: '惊讶', value: 'surprise' },
  ]
  return defaultEmotions.map(e => ({
    id: `emotion-${e.value}`,
    type: 'emotion' as const,
    label: e.label,
    value: e.value,
  }))
}

// 获取速度子菜单项
export function getSpeedSubMenu() {
  return SPEED_SUB_OPTIONS.map(opt => ({
    id: opt.id,
    type: 'speed' as const,
    label: opt.label,
    value: opt.value,
    description: opt.description,
  }))
}

// 菜单路径类型
export interface SpeedMenuPath {
  inSpeedMenu: boolean  // 是否在速度子菜单中
}

// Inline Node 类型，用于速度和情绪控制
export const TTSSpeedNode = Node.create({
  name: 'ttsSpeed',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      speed: {
        default: 1,
        parseHTML: element => parseFloat(element.getAttribute('data-speed') || '1'),
        renderHTML: attributes => {
          return { 'data-speed': attributes.speed }
        },
      },
      emotion: {
        default: '',
        parseHTML: element => element.getAttribute('data-emotion') || '',
        renderHTML: attributes => {
          if (!attributes.emotion) return {}
          return { 'data-emotion': attributes.emotion }
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
    return [{ tag: 'span[data-tts-speed]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const label = HTMLAttributes['data-label'] || '1x'
    return [
      'span',
      {
        ...HTMLAttributes,
        'data-tts-speed': '',
        class: 'tts-speed',
      },
      ['span', { class: 'tts-speed-label' }, label],
    ]
  },
})

// Plugin 选项
export interface TTSSpeedPluginOptions {
  char: string
  onOpen: (props: { range: { from: number; to: number }; query: string }) => void
  onClose: () => void
}

const TRIGGER_CHAR = '/'

export function createTTSSpeedPlugin(options: TTSSpeedPluginOptions) {
  return new Plugin({
    key: TTSSpeedPluginKey,

    state: {
      init() {
        return {
          active: false,
          range: null as { from: number; to: number } | null,
          query: '',
        }
      },
      apply(tr, prev) {
        const meta = tr.getMeta(TTSSpeedPluginKey)
        if (meta) {
          return { ...prev, ...meta }
        }
        return prev
      },
    },

    props: {
      handleKeyDown(view, event) {
        const { state } = view
        const pluginState = TTSSpeedPluginKey.getState(state)

        if (event.key === 'Escape' && pluginState?.active) {
          const tr = state.tr.setMeta(TTSSpeedPluginKey, { active: false, range: null, query: '' })
          view.dispatch(tr)
          options.onClose()
          return true
        }

        return false
      },

      handleTextInput(view, from, _to, text) {
        const { state } = view

        if (text === TRIGGER_CHAR) {
          const range = { from, to: from + 1 }
          const tr = state.tr.setMeta(TTSSpeedPluginKey, {
            active: true,
            range,
            query: ''
          })
          view.dispatch(tr)

          options.onOpen({ range, query: '' })
        }

        return false
      },

      handleClick(view) {
        const pluginState = TTSSpeedPluginKey.getState(view.state)
        if (pluginState?.active) {
          const tr = view.state.tr.setMeta(TTSSpeedPluginKey, { active: false, range: null, query: '' })
          view.dispatch(tr)
          options.onClose()
        }
        return false
      },
    },

    view() {
      return {
        update(view) {
          const state = view.state
          const pluginState = TTSSpeedPluginKey.getState(state)

          if (pluginState?.active && pluginState.range) {
            const { from } = pluginState.range
            const selection = state.selection

            if (selection.from <= from) {
              const tr = state.tr.setMeta(TTSSpeedPluginKey, { active: false, range: null, query: '' })
              view.dispatch(tr)
              options.onClose()
              return
            }

            const query = state.doc.textBetween(from + 1, selection.from)
            if (query !== pluginState.query) {
              const tr = state.tr.setMeta(TTSSpeedPluginKey, { query })
              view.dispatch(tr)
              options.onOpen({ range: pluginState.range, query })
            }
          }
        },
      }
    },
  })
}

// Speed Extension
export interface TTSSpeedOptions {
  char: string
  onMenuOpen?: (props: { range: { from: number; to: number }; query: string }) => void
  onMenuClose?: () => void
}

export const TTSSpeed = Extension.create<TTSSpeedOptions>({
  name: 'ttsSpeedExtension',

  priority: 100,

  addOptions() {
    return {
      char: '/',
      onMenuOpen: undefined,
      onMenuClose: undefined,
    }
  },

  addProseMirrorPlugins() {
    const { onMenuOpen, onMenuClose } = this.options

    return [
      createTTSSpeedPlugin({
        char: this.options.char,
        onOpen: (props) => {
          onMenuOpen?.(props)
        },
        onClose: () => {
          onMenuClose?.()
        },
      }),
    ]
  },
})
