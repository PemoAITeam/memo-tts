import { useState, useCallback, useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'

import { pluginStore } from '@/app/stores'

import type { MenuPath, SelectedVoiceConfig, TTSMenuItem } from './types'
import { buildMenuPathFromSelectedVoiceConfig, buildSelectedVoiceConfig, getLoadingMenuItems, getMenuItems, getNextMenuPath } from './data'
import { recentVoicesStore, type RecentVoiceEntry } from './recent-voices-store'
import { closeMentionMenu, isMentionMenuActive } from './tts-mention-plugin'

type TTSMenuMode = 'trigger' | 'edit'

export interface TTSMenuState {
  isOpen: boolean
  query: string
  range: { from: number; to: number } | null
  path: MenuPath
  items: TTSMenuItem[]
  selectedIndex: number
  position: { x: number; y: number }
  providerScope?: string
  mode: TTSMenuMode
}

interface UseTTSMentionMenuOptions {
  initialProvider?: string
  onVoiceSelect?: (config: SelectedVoiceConfig) => void
}

interface OpenTTSMenuOptions {
  range: { from: number; to: number }
  query: string
  path?: MenuPath
  providerScope?: string
  mode?: TTSMenuMode
}

interface OpenEditTTSMenuOptions {
  range: { from: number; to: number }
  config?: SelectedVoiceConfig | null
}

function buildInitialPath(provider?: string) {
  return provider ? { provider } : {}
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
    path: buildInitialPath(initialProvider),
    items: [],
    selectedIndex: 0,
    position: { x: 0, y: 0 },
    providerScope: initialProvider,
    mode: 'trigger',
  })

  const menuRef = useRef<HTMLDivElement>(null)
  const loadRequestIdRef = useRef(0)
  const [, setRecentVoicesVersion] = useState(0)

  useEffect(() => {
    return recentVoicesStore.subscribe(() => {
      setRecentVoicesVersion((version) => version + 1)
    })
  }, [])

  const loadItems = useCallback((path: MenuPath, query: string, providerScope?: string) => {
    const requestId = ++loadRequestIdRef.current

    setState((prev) => ({
      ...prev,
      path,
      query,
      items: getLoadingMenuItems(),
      selectedIndex: 0,
    }))

    void getMenuItems(path, query, providerScope)
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
  }, [])

  const openMenu = useCallback((props: OpenTTSMenuOptions) => {
    const { range, query, mode = 'trigger' } = props
    const { from } = range
    const coords = editor?.view.coordsAtPos(from)
    const providerScope = props.providerScope ?? props.path?.provider ?? initialProvider
    const nextPath = props.path || buildInitialPath(providerScope)

    setState({
      isOpen: true,
      query,
      range,
      path: nextPath,
      items: getLoadingMenuItems(),
      selectedIndex: 0,
      position: {
        x: coords?.left || 0,
        y: (coords?.bottom || coords?.top || 0) + 5,
      },
      providerScope,
      mode,
    })
    loadItems(nextPath, query, providerScope)
  }, [editor, initialProvider, loadItems])

  const openEditMenu = useCallback((props: OpenEditTTSMenuOptions) => {
    const providerScope = props.config?.provider
    const nextPath = buildMenuPathFromSelectedVoiceConfig(props.config)
      || buildInitialPath(providerScope)

    openMenu({
      range: props.range,
      query: '',
      path: nextPath,
      providerScope,
      mode: 'edit',
    })
  }, [openMenu])

  const closeMenu = useCallback(() => {
    loadRequestIdRef.current += 1

    if (editor && isMentionMenuActive(editor)) {
      closeMentionMenu(editor)
    }

    setState((prev) => ({
      ...prev,
      isOpen: false,
      path: buildInitialPath(initialProvider),
      query: '',
      range: null,
      items: [],
      providerScope: initialProvider,
      mode: 'trigger',
    }))
  }, [editor, initialProvider])

  const insertVoiceMention = useCallback((config: SelectedVoiceConfig) => {
    const { range } = state
    if (!range) {
      return
    }

    const replaceRange = state.mode === 'edit'
      ? range
      : {
        from: range.from,
        to: Math.max(editor?.state.selection.from || range.to, range.to),
      }

    editor
      ?.chain()
      .focus()
      .insertContentAt(replaceRange, {
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
      loadItems(nextPath, '', state.providerScope)
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
    const { path, providerScope } = state

    if (path.language || path.scene || path.model) {
      const newPath = { ...path }
      if (path.model) {
        delete newPath.model
      } else if (path.scene) {
        delete newPath.scene
      } else if (path.language) {
        delete newPath.language
      }
      loadItems(newPath, '', providerScope)
      return true
    }

    if (path.provider && !providerScope) {
      loadItems({}, '', undefined)
      return true
    }

    if (path.provider && providerScope) {
      closeMenu()
      return true
    }

    return false
  }, [state, closeMenu, loadItems])

  const setQuery = useCallback((query: string) => {
    loadItems(state.path, query, state.providerScope)
  }, [loadItems, state.path, state.providerScope])

  const currentRecentProvider = state.providerScope || state.path.provider || initialProvider
  const recentVoices = currentRecentProvider
    ? (() => {
      const currentPluginId = pluginStore.findTTSProviderByValue(currentRecentProvider)?.pluginId
      return currentPluginId
        ? recentVoicesStore.getRecentVoices(currentPluginId)
        : []
    })()
    : recentVoicesStore.getAllMostRecentVoices()

  const selectRecentVoice = useCallback((entry: RecentVoiceEntry) => {
    recentVoicesStore.addRecentVoice(entry.config)
    insertVoiceMention(entry.config)
  }, [insertVoiceMention])

  useEffect(() => {
    if (!state.isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (menuRef.current?.contains(target)) {
        return
      }

      if (target?.closest('[data-tts-mention]')) {
        return
      }

      if (menuRef.current) {
        setTimeout(() => {
          closeMenu()
        }, 100)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [state.isOpen, closeMenu])

  useEffect(() => {
    if (!editor || !state.isOpen || !state.range || state.mode !== 'trigger') {
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
  }, [closeMenu, editor, state.isOpen, state.mode, state.range])

  return {
    ...state,
    menuRef,
    selectItem,
    goBack,
    setQuery,
    closeMenu,
    openMenu,
    openEditMenu,
    recentVoices,
    selectRecentVoice,
  }
}
