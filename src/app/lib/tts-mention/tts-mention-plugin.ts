/**
 * 自定义 TTS Mention Plugin
 * 不依赖 @tiptap/suggestion，使用 TipTap 原生 Plugin 实现
 */

import { Plugin, PluginKey } from '@tiptap/pm/state'
import { SelectedVoiceConfig } from './types'

export interface TTSMentionPluginOptions {
  char: string
  onOpen: (props: { range: { from: number; to: number }; query: string }) => void
  onClose: () => void
  onSelect: (config: SelectedVoiceConfig, range: { from: number; to: number }) => void
}

export const TTSMentionPluginKey = new PluginKey('ttsMention')

// 触发器字符
const TRIGGER_CHAR = '@'

export function createTTSMentionPlugin(options: TTSMentionPluginOptions) {
  return new Plugin({
    key: TTSMentionPluginKey,

    state: {
      init() {
        return {
          active: false,
          range: null as { from: number; to: number } | null,
          query: '',
        }
      },
      apply(tr, prev) {
        const meta = tr.getMeta(TTSMentionPluginKey)
        if (meta) {
          return { ...prev, ...meta }
        }
        return prev
      },
    },

    props: {
      handleKeyDown(view, event) {
        const { state } = view
        const pluginState = TTSMentionPluginKey.getState(state)

        // 处理 Escape 键
        if (event.key === 'Escape' && pluginState?.active) {
          const tr = state.tr.setMeta(TTSMentionPluginKey, { active: false, range: null, query: '' })
          view.dispatch(tr)
          options.onClose()
          return true
        }

        return false
      },

      handleTextInput(view, from, _to, text) {
        const { state } = view

        // 检测 @ 字符输入
        if (text === TRIGGER_CHAR) {
          const range = { from, to: from + 1 }
          const tr = state.tr.setMeta(TTSMentionPluginKey, {
            active: true,
            range,
            query: ''
          })
          view.dispatch(tr)

          options.onOpen({ range, query: '' })
        }

        return false
      },

      // 处理点击事件，点击其他位置时关闭菜单
      handleClick(view) {
        const pluginState = TTSMentionPluginKey.getState(view.state)
        if (pluginState?.active) {
          const tr = view.state.tr.setMeta(TTSMentionPluginKey, { active: false, range: null, query: '' })
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
          const pluginState = TTSMentionPluginKey.getState(state)

          // 检测查询文本变化
          if (pluginState?.active && pluginState.range) {
            const { from } = pluginState.range
            const selection = state.selection

            // 如果光标移动到了 @ 之前或正好在 @ 位置（@ 被删除），关闭菜单
            if (selection.from <= from) {
              const tr = state.tr.setMeta(TTSMentionPluginKey, { active: false, range: null, query: '' })
              view.dispatch(tr)
              options.onClose()
              return
            }

            // 获取查询文本（从 @ 之后开始，不包含 @ 符号）
            const query = state.doc.textBetween(from + 1, selection.from)
            if (query !== pluginState.query) {
              const tr = state.tr.setMeta(TTSMentionPluginKey, { query })
              view.dispatch(tr)
              options.onOpen({ range: pluginState.range, query })
            }
          }
        },
      }
    },
  })
}

// 选择语音后的处理函数
export function selectVoice(
  editor: any,
  config: SelectedVoiceConfig,
) {
  const { state, view } = editor
  const pluginState = TTSMentionPluginKey.getState(state)

  if (!pluginState?.active || !pluginState.range) {
    return false
  }

  const { from } = pluginState.range
  const to = state.selection.from

  // 删除 @ 和查询文本
  const deleteTr = state.tr.delete(from, to)

  // 插入语音标签
  const voiceLabel = config.displayLabel || config.voiceLocalName || config.voice || config.voiceType || ''

  // 创建一个带有自定义属性的文本节点
  const node = state.schema.text(`@${voiceLabel}`, [
    state.schema.marks.ttsMention?.create({
      provider: config.provider,
      config: JSON.stringify(config),
    }) || null,
  ].filter(Boolean) as any[])

  deleteTr.replaceSelectionWith(node, false)
  deleteTr.setMeta(TTSMentionPluginKey, { active: false, range: null, query: '' })

  view.dispatch(deleteTr)

  return true
}

// 关闭菜单
export function closeMentionMenu(editor: any) {
  const { state, view } = editor
  const tr = state.tr.setMeta(TTSMentionPluginKey, { active: false, range: null, query: '' })
  view.dispatch(tr)
}

// 检查菜单是否激活
export function isMentionMenuActive(editor: any): boolean {
  const pluginState = TTSMentionPluginKey.getState(editor.state)
  return pluginState?.active || false
}

// 获取当前查询
export function getCurrentQuery(editor: any): string {
  const pluginState = TTSMentionPluginKey.getState(editor.state)
  return pluginState?.query || ''
}

// 获取当前范围
export function getCurrentRange(editor: any): { from: number; to: number } | null {
  const pluginState = TTSMentionPluginKey.getState(editor.state)
  return pluginState?.range || null
}
