import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import type { Editor } from '@tiptap/react'

import { pluginStore } from '@/app/stores'

import type { MenuPath, SelectedVoiceConfig, TTSMenuItem } from './types'
import { buildSelectedVoiceConfig, getLoadingMenuItems, getMenuItems, getNextMenuPath } from './data'
import { recentVoicesStore, type RecentVoiceEntry } from './recent-voices-store'
import { closeMentionMenu, isMentionMenuActive } from './tts-mention-plugin'

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
  const [recentVoicesVersion, setRecentVoicesVersion] = useState(0)

  useEffect(() => {
    return recentVoicesStore.subscribe(() => {
      setRecentVoicesVersion((version) => version + 1)
    })
  }, [])

  const loadItems = useCallback((path: MenuPath, query: string) => {
    const requestId = ++loadRequestIdRef.current

    setState((prev) => ({
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

        setState((prev) => ({
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

        setState((prev) => ({
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

    if (editor && isMentionMenuActive(editor)) {
      closeMentionMenu(editor)
    }

    setState((prev) => ({
      ...prev,
      isOpen: false,
      path: initialProvider ? { provider: initialProvider } : {},
      query: '',
      range: null,
      items: [],
    }))
  }, [editor, initialProvider])

  const insertVoiceMention = useCallback((config: SelectedVoiceConfig) => {
    const { range } = state
    if (!range) {
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
  }, [state, editor, onVoiceSelect, closeMenu])

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

      recentVoicesStore.addRecentVoice(config)
      insertVoiceMention(config)
    }
  }, [state, insertVoiceMention, loadItems])

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

  const recentVoices = useMemo(() => {
    const currentProvider = state.path.provider || initialProvider
    if (currentProvider) {
      const currentPluginId = pluginStore.findTTSProviderByValue(currentProvider)?.pluginId
      return currentPluginId
        ? recentVoicesStore.getRecentVoices(currentPluginId)
        : []
    }

    return recentVoicesStore.getAllMostRecentVoices()
  }, [initialProvider, recentVoicesVersion, state.path.provider])

  const selectRecentVoice = useCallback((entry: RecentVoiceEntry) => {
    recentVoicesStore.addRecentVoice(entry.config)
    insertVoiceMention(entry.config)
  }, [insertVoiceMention])

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

  useEffect(() => {
    if (!editor || !state.isOpen || !state.range) {
      return
    }

    const { from } = state.range

    const syncMenuVisibility = () => {
      const selectionFrom = editor.state.selection.from
      let triggerExists = false

      try {
        triggerExists = editor.state.doc.textBetween(from, from + 1) === '@'
      } catch {
        triggerExists = false
      }

      if (!triggerExists || selectionFrom <= from) {
        closeMenu()
      }
    }

    syncMenuVisibility()
    editor.on('transaction', syncMenuVisibility)
    editor.on('selectionUpdate', syncMenuVisibility)

    return () => {
      editor.off('transaction', syncMenuVisibility)
      editor.off('selectionUpdate', syncMenuVisibility)
    }
  }, [closeMenu, editor, state.isOpen, state.range])

  return {
    ...state,
    menuRef,
    selectItem,
    goBack,
    setQuery,
    closeMenu,
    openMenu,
    recentVoices,
    selectRecentVoice,
  }
}
