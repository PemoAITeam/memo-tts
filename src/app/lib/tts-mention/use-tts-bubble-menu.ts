/**
 * TTS Bubble Menu Hook
 * 用于管理选中文本后的悬浮菜单状态
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Editor } from '@tiptap/react'
import { getEmotionSubMenu, SpeedMenuItem } from './tts-speed'
import type { ScenesType } from '../volcano.config'

const TTS_MARK_NAME = 'ttsMark'

export interface TTSBubbleMenuState {
  isOpen: boolean
  position: { x: number; y: number }
  speed: number | null
  emotion: string | null
}

interface UseTTSBubbleMenuOptions {
  provider?: 'Edge' | 'OpenAI' | 'Volcano'
  scene?: ScenesType
}

// 保存选区的接口
interface SavedSelection {
  from: number
  to: number
}

export function useTTSBubbleMenu(
  editor: Editor | null,
  options?: UseTTSBubbleMenuOptions
) {
  const { provider, scene } = options || {}

  const [state, setState] = useState<TTSBubbleMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    speed: null,
    emotion: null,
  })

  const menuRef = useRef<HTMLDivElement>(null)
  const savedSelectionRef = useRef<SavedSelection | null>(null)

  // 获取情绪选项列表
  const getEmotionOptions = useCallback((): SpeedMenuItem[] => {
    return getEmotionSubMenu(provider, scene)
  }, [provider, scene])

  // 计算菜单位置
  const calculatePosition = useCallback((): { x: number; y: number } => {
    if (!editor) return { x: 0, y: 0 }

    const { from, to } = editor.state.selection
    const start = editor.view.coordsAtPos(from)
    const end = editor.view.coordsAtPos(to)

    // 菜单显示在选区上方居中
    const x = (start.left + end.right) / 2
    const y = Math.min(start.top, end.top) - 10 // 选区上方 10px

    return { x, y }
  }, [editor])

  // 获取当前选区的 TTS 属性
  const getCurrentAttributes = useCallback((): { speed: number | null; emotion: string | null } => {
    if (!editor) return { speed: null, emotion: null }

    const { from, to } = editor.state.selection

    // 尝试获取选区内的 mark 属性
    const ttsMarkType = editor.state.schema.marks.ttsMark
    if (!ttsMarkType) return { speed: null, emotion: null }

    let speed: number | null = null
    let emotion: string | null = null

    // 遍历选区内的所有位置，查找 ttsMark
    editor.state.doc.nodesBetween(from, to, (node) => {
      if (node.marks) {
        node.marks.forEach((mark) => {
          if (mark.type === ttsMarkType) {
            if (mark.attrs.speed !== null && mark.attrs.speed !== undefined) {
              speed = mark.attrs.speed
            }
            if (mark.attrs.emotion !== null && mark.attrs.emotion !== undefined) {
              emotion = mark.attrs.emotion
            }
          }
        })
      }
    })

    // 如果没找到，尝试从编辑器获取活动 mark
    if (speed === null && emotion === null) {
      try {
        const attrs = editor.getAttributes(TTS_MARK_NAME)
        if (attrs.speed !== undefined && attrs.speed !== null) {
          speed = attrs.speed
        }
        if (attrs.emotion !== undefined && attrs.emotion !== null) {
          emotion = attrs.emotion
        }
      } catch (e) {
        // 忽略错误
      }
    }

    return { speed, emotion }
  }, [editor])

  // 检查选区是否有效（非空且有文本）
  const isValidSelection = useCallback((): boolean => {
    if (!editor) return false

    const { from, to, empty } = editor.state.selection

    // 空选区不显示
    if (empty) return false

    // 选区长度过小不显示
    if (to - from < 1) return false

    return true
  }, [editor])

  // 更新菜单状态
  const updateMenuState = useCallback(() => {
    if (!editor) return

    const shouldShow = isValidSelection()

    if (shouldShow) {
      // 保存当前选区
      const { from, to } = editor.state.selection
      savedSelectionRef.current = { from, to }

      const position = calculatePosition()
      const { speed, emotion } = getCurrentAttributes()

      setState({
        isOpen: true,
        position,
        speed,
        emotion,
      })
    } else {
      setState(prev => ({ ...prev, isOpen: false }))
    }
  }, [editor, isValidSelection, calculatePosition, getCurrentAttributes])

  // 恢复选区并执行命令
  const withSavedSelection = useCallback((callback: () => void) => {
    if (!editor || !savedSelectionRef.current) {
      callback()
      return
    }

    const { from, to } = savedSelectionRef.current
    // 恢复选区
    editor.chain().focus().setTextSelection({ from, to }).run()
    callback()
  }, [editor])

  // 设置速度
  const setSpeed = useCallback((speed: number | null) => {
    if (!editor) return

    withSavedSelection(() => {
      const { emotion } = getCurrentAttributes()

      // 1倍速是默认值，不需要标记
      if (speed === null || speed === 1) {
        // 移除速度属性，但保留 emotion
        if (emotion && emotion !== 'none') {
          editor.chain().setMark(TTS_MARK_NAME, { emotion }).run()
        } else {
          editor.chain().unsetMark(TTS_MARK_NAME).run()
        }
      } else {
        editor.chain().setMark(TTS_MARK_NAME, { speed, emotion }).run()
      }
    })

    // 1倍速显示为 null（默认）
    setState(prev => ({ ...prev, speed: speed === 1 ? null : speed }))
  }, [editor, getCurrentAttributes, withSavedSelection])

  // 设置情绪
  const setEmotion = useCallback((emotion: string | null) => {
    if (!editor) return

    withSavedSelection(() => {
      const { speed } = getCurrentAttributes()

      if (emotion === null || emotion === 'none') {
        // 移除情绪属性，但保留 speed（1倍速除外）
        if (speed && speed !== 1) {
          editor.chain().setMark(TTS_MARK_NAME, { speed }).run()
        } else {
          editor.chain().unsetMark(TTS_MARK_NAME).run()
        }
      } else {
        // 设置情绪时，只有非1倍速才保留 speed
        const attrs: { speed?: number; emotion: string } = { emotion }
        if (speed && speed !== 1) {
          attrs.speed = speed
        }
        editor.chain().setMark(TTS_MARK_NAME, attrs).run()
      }
    })

    setState(prev => ({ ...prev, emotion: emotion === 'none' ? null : emotion }))
  }, [editor, getCurrentAttributes, withSavedSelection])

  // 清除所有标记
  const clearMark = useCallback(() => {
    if (!editor) return

    withSavedSelection(() => {
      editor.chain().unsetMark(TTS_MARK_NAME).run()
    })
    setState(prev => ({ ...prev, speed: null, emotion: null }))
  }, [editor, withSavedSelection])

  // 关闭菜单
  const closeMenu = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  // 监听编辑器选区变化
  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      // 使用 setTimeout 确保选区已更新
      setTimeout(updateMenuState, 0)
    }

    editor.on('selectionUpdate', handleSelectionUpdate)
    editor.on('update', handleSelectionUpdate)

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
      editor.off('update', handleSelectionUpdate)
    }
  }, [editor, updateMenuState])

  // 点击外部关闭菜单
  useEffect(() => {
    if (!state.isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // 不关闭，让选区变化时自然会关闭
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [state.isOpen])

  return {
    ...state,
    menuRef,
    getEmotionOptions,
    setSpeed,
    setEmotion,
    clearMark,
    closeMenu,
  }
}
