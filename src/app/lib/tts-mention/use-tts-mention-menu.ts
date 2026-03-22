/**
 * TTS Mention Menu Hook
 * 鐢ㄤ簬鍦?React 缁勪欢涓鐞?@ 鑿滃崟鐨勭姸鎬?
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'

import type { MenuPath, SelectedVoiceConfig, TTSMenuItem } from './types'
import { buildSelectedVoiceConfig, getLoadingMenuItems, getMenuItems, getNextMenuPath } from './data'

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
  initialProvider?: string
  onVoiceSelect?: (config: SelectedVoiceConfig) => void
}

export function useTTSMentionMenu(
  editor: Editor | null,
  options?: UseTTSMentionMenuOptions | ((config: SelectedVoiceConfig) => void)
) {
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
  const loadRequestIdRef = useRef(0)

  const loadItems = useCallback((path: MenuPath, query: string) => {
    const requestId = ++loadRequestIdRef.current

    setState(prev => ({
      ...prev,
      path,
      query,
      items: getLoadingMenuItems(),
      selectedIndex: 0,
    }))

    void getMenuItems(path, query, initialProvider)
      .then((items) => {
        if (loadRequestIdRef.current !== requestId) {
          return
        }

        setState(prev => ({
          ...prev,
          path,
          query,
          items,
          selectedIndex: 0,
        }))
      })
      .catch(() => {
        if (loadRequestIdRef.current !== requestId) {
          return
        }

        setState(prev => ({
          ...prev,
          path,
          query,
          items: [],
          selectedIndex: 0,
        }))
      })
  }, [initialProvider])

  const openMenu = useCallback((props: { range: { from: number; to: number }; query: string }) => {
    const { range, query } = props
    const { from } = range
    const coords = editor?.view.coordsAtPos(from)

    const initialPath = initialProvider ? { provider: initialProvider } : {}

    setState({
      isOpen: true,
      query,
      range,
      path: initialPath,
      items: getLoadingMenuItems(),
      selectedIndex: 0,
      position: {
        x: coords?.left || 0,
        y: (coords?.bottom || coords?.top || 0) + 5,
      },
    })
    loadItems(initialPath, query)
  }, [editor, initialProvider, loadItems])

  const closeMenu = useCallback(() => {
    loadRequestIdRef.current += 1
    setState(prev => ({
      ...prev,
      isOpen: false,
      path: initialProvider ? { provider: initialProvider } : {},
      query: '',
      range: null,
      items: [],
    }))
  }, [initialProvider])

  const selectItem = useCallback((item: TTSMenuItem) => {
    if (item.disabled) {
      return
    }

    const { path, range } = state
    const itemPath = (item.data?.menuPath as MenuPath | undefined) || path
    const nextPath = getNextMenuPath(itemPath, item)

    if (nextPath) {
      loadItems(nextPath, '')
      return
    }

    if (item.type === 'voice' && range) {
      const config = buildSelectedVoiceConfig(itemPath, item)
      if (!config) {
        return
      }

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
            label: config.displayLabel || config.voiceLocalName,
          },
        })
        .run()

      onVoiceSelect?.(config)
      closeMenu()
    }
  }, [state, editor, onVoiceSelect, closeMenu, loadItems])

  const goBack = useCallback(() => {
    const { path } = state

    if (path.language || path.scene || path.model) {
      const newPath = { ...path }
      if (path.model) {
        delete newPath.model
      } else if (path.scene) {
        delete newPath.scene
      } else if (path.language) {
        delete newPath.language
      }
      loadItems(newPath, '')
      return true
    }

    if (path.provider && !initialProvider) {
      loadItems({}, '')
      return true
    }

    if (path.provider && initialProvider) {
      closeMenu()
      return true
    }

    return false
  }, [state, initialProvider, closeMenu, loadItems])

  const setQuery = useCallback((query: string) => {
    loadItems(state.path, query)
  }, [loadItems, state.path])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!state.isOpen) return false

    const { items, selectedIndex } = state

    switch (event.key) {
      case 'ArrowDown':
        if (items.length === 0) return true
        event.preventDefault()
        setState(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % items.length,
        }))
        return true

      case 'ArrowUp':
        if (items.length === 0) return true
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
        if (!state.query) {
          closeMenu()
          return false
        }
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

  useEffect(() => {
    if (!state.isOpen) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isOpen, handleKeyDown])

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
    openMenu,
  }
}
