/**
 * TTS Mention Menu Hook
 * 用于在 React 组件中管理 @ 菜单的状态
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { Editor } from '@tiptap/react'
import { SelectedVoiceConfig, MenuPath, TTSMenuItem } from './types'
import { getMenuItems } from './data'

export interface TTSMenuState {
  isOpen: boolean
  query: string
  range: { from: number; to: number } | null
  path: MenuPath
  items: TTSMenuItem[]
  selectedIndex: number
  position: { x: number; y: number }
}

interface UseTTSMentionMenuOptions {
  initialProvider?: 'Edge' | 'Volcano' | 'OpenAI'
  onVoiceSelect?: (config: SelectedVoiceConfig) => void
}

export function useTTSMentionMenu(
  editor: Editor | null,
  options?: UseTTSMentionMenuOptions | ((config: SelectedVoiceConfig) => void)
) {
  // 兼容旧的 API：第二个参数可以是回调函数
  const opts: UseTTSMentionMenuOptions = typeof options === 'function'
    ? { onVoiceSelect: options }
    : options || {}

  const { initialProvider, onVoiceSelect } = opts

  const [state, setState] = useState<TTSMenuState>({
    isOpen: false,
    query: '',
    range: null,
    path: initialProvider ? { provider: initialProvider } : {},
    items: [],
    selectedIndex: 0,
    position: { x: 0, y: 0 },
  })

  const menuRef = useRef<HTMLDivElement>(null)

  // 打开菜单 - 由 extension 回调触发
  const openMenu = useCallback((props: { range: { from: number; to: number }; query: string }) => {
    const { range, query } = props
    const { from } = range
    const coords = editor?.view.coordsAtPos(from)

    const initialPath = initialProvider ? { provider: initialProvider } : {}
    const items = getMenuItems(initialPath, query, initialProvider)

    console.log('[TTS Mention] openMenu:', {
      range,
      query,
      initialProvider,
      itemsCount: items.length,
    })

    setState({
      isOpen: true,
      query,
      range,
      path: initialPath,
      items,
      selectedIndex: 0,
      position: {
        x: coords?.left || 0,
        y: (coords?.bottom || coords?.top || 0) + 5
      },
    })
  }, [editor, initialProvider])

  // 关闭菜单
  const closeMenu = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      path: {},
      query: '',
      range: null,
      items: [],
    }))
  }, [])

  // 选择项目
  const selectItem = useCallback((item: TTSMenuItem) => {
    const { path, range } = state

    // 如果是服务提供商，进入下一级
    if (item.type === 'provider') {
      const newPath: MenuPath = { provider: item.data?.provider as any }
      setState(prev => ({
        ...prev,
        path: newPath,
        query: '',
        items: getMenuItems(newPath, '', initialProvider),
        selectedIndex: 0,
      }))
      return
    }

    // 如果是语言，进入语音列表
    if (item.type === 'language' && path.provider === 'Edge') {
      const newPath: MenuPath = { ...path, language: item.data?.code }
      setState(prev => ({
        ...prev,
        path: newPath,
        query: '',
        items: getMenuItems(newPath, '', initialProvider),
        selectedIndex: 0,
      }))
      return
    }

    // 如果是场景，进入语音列表
    if (item.type === 'scene' && path.provider === 'Volcano') {
      const newPath: MenuPath = { ...path, scene: item.data?.scene }
      setState(prev => ({
        ...prev,
        path: newPath,
        query: '',
        items: getMenuItems(newPath, '', initialProvider),
        selectedIndex: 0,
      }))
      return
    }

    // 如果是模型，进入语音列表
    if (item.type === 'model' && path.provider === 'OpenAI') {
      const newPath: MenuPath = { ...path, model: item.data?.model }
      setState(prev => ({
        ...prev,
        path: newPath,
        query: '',
        items: getMenuItems(newPath, '', initialProvider),
        selectedIndex: 0,
      }))
      return
    }

    // 如果是语音，完成选择
    if (item.type === 'voice' && range) {
      const config: SelectedVoiceConfig = {
        provider: path.provider!,
        voiceLocalName: item.label,
        rawData: item.data,
      }

      if (path.provider === 'Edge') {
        config.lang = path.language
        config.voiceName = item.data?.shortName
      } else if (path.provider === 'Volcano') {
        config.scene = path.scene
        config.voiceType = item.data?.voiceType
      } else if (path.provider === 'OpenAI') {
        config.model = path.model
        config.voice = item.data?.voice
      }

      // 删除 @ 和查询文本
      const { from } = range
      const to = editor?.state.selection.from || from

      editor
        ?.chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent({
          type: 'ttsMention',
          attrs: {
            provider: config.provider,
            config: JSON.stringify(config),
            label: config.voiceLocalName,
          },
        })
        .run()

      onVoiceSelect?.(config)
      closeMenu()
    }
  }, [state, editor, onVoiceSelect, closeMenu, initialProvider])

  // 返回上一级
  const goBack = useCallback(() => {
    const { path } = state

    if (path.language || path.scene || path.model) {
      const newPath = { ...path }
      delete newPath.language
      delete newPath.scene
      delete newPath.model
      setState(prev => ({
        ...prev,
        path: newPath,
        query: '',
        items: getMenuItems(newPath, '', initialProvider),
        selectedIndex: 0,
      }))
      return true
    } else if (path.provider && !initialProvider) {
      setState(prev => ({
        ...prev,
        path: {},
        query: '',
        items: getMenuItems({}, '', initialProvider),
        selectedIndex: 0,
      }))
      return true
    } else if (path.provider && initialProvider) {
      closeMenu()
      return true
    }
    return false
  }, [state, initialProvider, closeMenu])

  // 更新查询
  const setQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      query,
      items: getMenuItems(prev.path, query, initialProvider),
      selectedIndex: 0,
    }))
  }, [initialProvider])

  // 键盘导航
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!state.isOpen) return false

    const { items, selectedIndex } = state

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % items.length,
        }))
        return true

      case 'ArrowUp':
        event.preventDefault()
        setState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex - 1 + items.length) % items.length,
        }))
        return true

      case 'ArrowLeft':
        if (!state.query) {
          event.preventDefault()
          goBack()
          return true
        }
        return false

      case 'Backspace':
        // 如果 query 为空，关闭菜单并让编辑器处理删除
        if (!state.query) {
          closeMenu()
          return false
        }
        // 如果有 query，让编辑器自然删除字符
        return false

      case 'Enter':
        event.preventDefault()
        if (items.length > 0) {
          selectItem(items[selectedIndex])
        }
        return true

      case 'Escape':
        event.preventDefault()
        closeMenu()
        return true

      default:
        return false
    }
  }, [state, goBack, selectItem, closeMenu])

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
    selectItem,
    goBack,
    setQuery,
    closeMenu,
    openMenu, // 导出 openMenu 供 extension 使用
  }
}
