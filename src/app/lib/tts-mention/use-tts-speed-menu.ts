/**
 * TTS Speed Menu Hook
 * 用于管理 / 菜单的状态
 * 第一级：速度入口 + 情绪入口
 * 第二级（速度入口）：具体速度值
 * 第二级（情绪入口）：具体情绪值
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Editor } from '@tiptap/react'
import {
  getSpeedMenuLevel1,
  getSpeedSubMenu,
  getEmotionSubMenu,
  SpeedMenuItem,
} from './tts-speed'
import type { ScenesType } from '../volcano.config'

// Re-export SpeedMenuItem for external use
export type { SpeedMenuItem }

export interface TTSSpeedMenuState {
  isOpen: boolean
  query: string
  range: { from: number; to: number } | null
  level: 'main' | 'speed' | 'emotion'  // 当前菜单层级：主菜单、速度子菜单 或 情绪子菜单
  items: SpeedMenuItem[]
  selectedIndex: number
  position: { x: number; y: number }
}

interface UseTTSSpeedMenuOptions {
  provider?: 'Edge' | 'OpenAI' | 'Volcano'
  scene?: ScenesType  // 火山引擎场景
}

export function useTTSSpeedMenu(
  editor: Editor | null,
  options?: UseTTSSpeedMenuOptions
) {
  const { provider, scene } = options || {}

  const [state, setState] = useState<TTSSpeedMenuState>({
    isOpen: false,
    query: '',
    range: null,
    level: 'main',
    items: [],
    selectedIndex: 0,
    position: { x: 0, y: 0 },
  })

  const menuRef = useRef<HTMLDivElement>(null)

  // 获取当前层级的基础菜单项
  const getBaseItems = useCallback((level: 'main' | 'speed' | 'emotion'): SpeedMenuItem[] => {
    if (level === 'main') {
      return getSpeedMenuLevel1()
    } else if (level === 'speed') {
      return getSpeedSubMenu()
    } else {
      return getEmotionSubMenu(provider, scene)
    }
  }, [provider, scene])

  // 过滤选项
  const filterItems = useCallback((query: string, items: SpeedMenuItem[]): SpeedMenuItem[] => {
    if (!query.trim()) return items
    const q = query.toLowerCase().trim()
    return items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    )
  }, [])

  // 打开菜单
  const openMenu = useCallback((props: { range: { from: number; to: number }; query: string }) => {
    const { range, query } = props
    const { from } = range
    const coords = editor?.view.coordsAtPos(from)
    const baseItems = getBaseItems('main')

    setState({
      isOpen: true,
      query,
      range,
      level: 'main',
      items: filterItems(query, baseItems),
      selectedIndex: 0,
      position: {
        x: coords?.left || 0,
        y: (coords?.bottom || coords?.top || 0) + 5
      },
    })
  }, [editor, getBaseItems, filterItems])

  // 关闭菜单
  const closeMenu = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      query: '',
      range: null,
      level: 'main',
      items: [],
    }))
  }, [])

  // 进入速度子菜单
  const enterSpeedMenu = useCallback(() => {
    const speedItems = getSpeedSubMenu()
    setState(prev => ({
      ...prev,
      level: 'speed',
      query: '',
      items: speedItems,
      selectedIndex: 0,
    }))
  }, [])

  // 进入情绪子菜单
  const enterEmotionMenu = useCallback(() => {
    const emotionItems = getEmotionSubMenu(provider, scene)
    setState(prev => ({
      ...prev,
      level: 'emotion',
      query: '',
      items: emotionItems,
      selectedIndex: 0,
    }))
  }, [provider, scene])

  // 返回主菜单
  const goBackToMain = useCallback(() => {
    const mainItems = getBaseItems('main')
    setState(prev => ({
      ...prev,
      level: 'main',
      query: '',
      items: filterItems('', mainItems),
      selectedIndex: 0,
    }))
  }, [getBaseItems, filterItems])

  // 插入节点
  const insertNode = useCallback((item: SpeedMenuItem) => {
    const { range, level } = state
    if (!range || !editor) return

    const { from } = range
    const to = editor.state.selection.from

    let label = ''
    let speed: number | undefined
    let emotion: string | undefined

    if (level === 'speed') {
      // 从速度子菜单选择
      speed = item.value as number
      label = item.label
    } else if (level === 'emotion') {
      // 从情绪子菜单选择
      emotion = item.value as string
      label = item.label
    } else if (item.type === 'speedEntry' || item.type === 'emotionEntry') {
      // 不应该发生，入口应该进入子菜单
      return
    }

    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContent({
        type: 'ttsSpeed',
        attrs: {
          speed: speed ?? 1,
          emotion: emotion ?? '',
          label: label,
        },
      })
      .insertContent(' ')
      .run()

    closeMenu()
  }, [state, editor, closeMenu])

  // 选择项目
  const selectItem = useCallback((item: SpeedMenuItem) => {
    if (state.level === 'main' && item.type === 'speedEntry') {
      // 点击速度入口，进入速度子菜单
      enterSpeedMenu()
    } else if (state.level === 'main' && item.type === 'emotionEntry') {
      // 点击情绪入口，进入情绪子菜单
      enterEmotionMenu()
    } else {
      // 其他情况，插入节点
      insertNode(item)
    }
  }, [state.level, enterSpeedMenu, enterEmotionMenu, insertNode])

  // 更新查询
  const setQuery = useCallback((query: string) => {
    setState(prev => {
      const baseItems = getBaseItems(prev.level)
      return {
        ...prev,
        query,
        items: filterItems(query, baseItems),
        selectedIndex: 0,
      }
    })
  }, [getBaseItems, filterItems])

  // 键盘导航
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!state.isOpen) return false

    const { items, selectedIndex, level } = state

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        event.stopImmediatePropagation()
        setState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % items.length,
        }))
        return true

      case 'ArrowUp':
        event.preventDefault()
        event.stopImmediatePropagation()
        setState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex - 1 + items.length) % items.length,
        }))
        return true

      case 'ArrowLeft':
        if (level === 'speed' || level === 'emotion') {
          event.preventDefault()
          event.stopImmediatePropagation()
          goBackToMain()
          return true
        }
        return false

      case 'ArrowRight':
        if (level === 'main') {
          const selectedItem = items[selectedIndex]
          if (selectedItem?.type === 'speedEntry') {
            event.preventDefault()
            event.stopImmediatePropagation()
            enterSpeedMenu()
            return true
          } else if (selectedItem?.type === 'emotionEntry') {
            event.preventDefault()
            event.stopImmediatePropagation()
            enterEmotionMenu()
            return true
          }
        }
        return false

      case 'Enter':
        event.preventDefault()
        event.stopImmediatePropagation()
        if (items.length > 0) {
          selectItem(items[selectedIndex])
        }
        return true

      case 'Escape':
        event.preventDefault()
        event.stopImmediatePropagation()
        closeMenu()
        return true

      case 'Backspace':
        if (!state.query && (level === 'speed' || level === 'emotion')) {
          goBackToMain()
          return false
        }
        if (!state.query) {
          closeMenu()
        }
        return false

      default:
        return false
    }
  }, [state, selectItem, closeMenu, goBackToMain, enterSpeedMenu, enterEmotionMenu])

  // 全局键盘事件
  useEffect(() => {
    if (!state.isOpen) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isOpen, handleKeyDown])

  // 点击外部关闭
  useEffect(() => {
    if (!state.isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setTimeout(() => {
          closeMenu()
        }, 100)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [state.isOpen, closeMenu])

  return {
    ...state,
    menuRef,
    openMenu,
    closeMenu,
    selectItem,
    setQuery,
    goBack: goBackToMain,
    enterSpeedMenu,
    enterEmotionMenu,
  }
}
