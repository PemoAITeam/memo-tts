import { useState, useCallback, useEffect, useRef } from 'react'
import { Editor } from '@tiptap/react'
import { pluginStore } from '@/app/stores'
import { translatePluginOptionLabel, translatePluginText } from '@/app/lib/plugin-i18n'
import {
  getTTSSelectionConfig,
  getProviderEditorFieldKeyMap,
  getProviderEditorFieldOptions,
  getProviderEditorFields,
  type TTSProviderEditorField,
} from '@/app/lib/tts-plugin'
import { getActiveTTSMentionValueBeforeOffset } from '@/app/lib/tts-segments'
import {
  buildTTSMarkAttributesFromConfig,
  getTTSMarkConfigFromAttributes,
} from './tts-mark'
import type { TTSFieldOption, TTSSegmentFieldControl } from './types'

const TTS_MARK_NAME = 'ttsMark'

export interface TTSBubbleMenuState {
  isOpen: boolean
  position: { x: number; y: number }
  config: Record<string, any>
  contextConfig: Record<string, any>
}

interface UseTTSBubbleMenuOptions {
  provider?: string
  configKey?: string
}

interface SavedSelection {
  from: number
  to: number
}

const RADIX_DROPDOWN_SELECTOR = '[data-radix-popper-content-wrapper], [role="menu"]'

function isNodeTarget(target: EventTarget | null): target is Node {
  return !!target && typeof (target as Node).nodeType === 'number'
}

function isElementTarget(target: EventTarget | null): target is Element {
  return !!target && typeof (target as Element).closest === 'function'
}

function getFallbackSelectionPosition(editor: Editor, from: number, to: number) {
  const start = editor.view.coordsAtPos(from)
  const end = editor.view.coordsAtPos(to)
  const left = Math.min(start.left, end.left)
  const right = Math.max(start.right, end.right, start.left, end.left)

  return {
    x: (left + right) / 2,
    y: Math.min(start.top, end.top),
  }
}

function getMiddleSelectionPosition(editor: Editor, from: number, to: number) {
  try {
    const ownerDocument = editor.view.dom.ownerDocument
    const range = ownerDocument.createRange()
    const start = editor.view.domAtPos(from)
    const end = editor.view.domAtPos(to)

    range.setStart(start.node, start.offset)
    range.setEnd(end.node, end.offset)

    const rects = Array.from(range.getClientRects())
      .filter((rect) => rect.width > 0 && rect.height > 0)

    range.detach?.()

    if (!rects.length) {
      return getFallbackSelectionPosition(editor, from, to)
    }

    const totalWidth = rects.reduce((total, rect) => total + rect.width, 0)
    let remainingWidth = totalWidth / 2

    for (const rect of rects) {
      if (remainingWidth <= rect.width) {
        return {
          x: rect.left + remainingWidth,
          y: rect.top,
        }
      }

      remainingWidth -= rect.width
    }

    const lastRect = rects[rects.length - 1]
    return {
      x: lastRect.left + lastRect.width / 2,
      y: lastRect.top,
    }
  } catch {
    return getFallbackSelectionPosition(editor, from, to)
  }
}

function stableSerializeConfig(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerializeConfig(item)).join(',')}]`
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, itemValue]) => `${JSON.stringify(key)}:${stableSerializeConfig(itemValue)}`)

    return `{${entries.join(',')}}`
  }

  return JSON.stringify(value)
}

function isSameFieldOptions(nextOptions: TTSFieldOption[], prevOptions: TTSFieldOption[]) {
  if (nextOptions.length !== prevOptions.length) {
    return false
  }

  return nextOptions.every((item, index) => {
    const current = prevOptions[index]
    return !!current
      && current.id === item.id
      && current.type === item.type
      && current.label === item.label
      && current.value === item.value
      && current.description === item.description
      && current.fieldKey === item.fieldKey
      && current.role === item.role
  })
}

function isSameControls(nextControls: TTSSegmentFieldControl[], prevControls: TTSSegmentFieldControl[]) {
  if (nextControls.length !== prevControls.length) {
    return false
  }

  return nextControls.every((item, index) => {
    const current = prevControls[index]
    return !!current
      && current.key === item.key
      && current.label === item.label
      && current.type === item.type
      && current.role === item.role
      && current.value === item.value
      && isSameFieldOptions(item.options, current.options)
  })
}

function normalizeFieldValue(field: Pick<TTSProviderEditorField, 'role'>, value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (field.role === 'speed') {
    const numericValue = Number(value)
    if (Number.isFinite(numericValue) && numericValue === 1) {
      return null
    }
  }

  if (field.role === 'emotion' && value === 'none') {
    return null
  }

  return value as string | number
}

export function useTTSBubbleMenu(
  editor: Editor | null,
  options?: UseTTSBubbleMenuOptions
) {
  const activeProvider = options?.provider || pluginStore.provider

  const [state, setState] = useState<TTSBubbleMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    config: {},
    contextConfig: {},
  })
  const [fields, setFields] = useState<TTSSegmentFieldControl[]>([])

  const menuRef = useRef<HTMLDivElement>(null)
  const savedSelectionRef = useRef<SavedSelection | null>(null)
  const suppressSelectionCloseUntilRef = useRef(0)

  const getProviderContext = useCallback(() => {
    if (!activeProvider) {
      return {
        providerMeta: undefined,
        fieldKeyMap: {},
        segmentFields: [],
      }
    }

    const providerMeta = pluginStore.findTTSProviderByValue(activeProvider)
    const manifest = pluginStore.findManifestByProviderValue(activeProvider)
    const fieldKeyMap = getProviderEditorFieldKeyMap(providerMeta, manifest, 'segment')
    const segmentFields = getProviderEditorFields(providerMeta, manifest)
      .filter((field) => field.scope.includes('segment') && field.role !== 'voice')

    return {
      providerMeta,
      fieldKeyMap,
      segmentFields,
    }
  }, [activeProvider])

  const mapFieldOptions = useCallback((
    pluginId: string | undefined,
    field: Pick<TTSProviderEditorField, 'key' | 'type' | 'role' | 'useI18nOptions'>,
    options: Array<{ value: string | number; label: string; description?: string }>
  ): TTSFieldOption[] => {
    return options.map((option) => ({
      id: `${field.key}-${option.value}`,
      type: field.type,
      fieldKey: field.key,
      role: field.role,
      label: translatePluginOptionLabel(pluginId, option.label, field.useI18nOptions),
      value: option.value,
      description: option.description
        ? translatePluginText(pluginId, option.description, option.description)
        : option.description,
    }))
  }, [])

  const getCurrentConfig = useCallback(() => {
    if (!editor) {
      return {}
    }

    const { from, to } = editor.state.selection
    const ttsMarkType = editor.state.schema.marks.ttsMark
    if (!ttsMarkType) {
      return {}
    }

    const { fieldKeyMap } = getProviderContext()
    let currentConfig: Record<string, any> | null = null

    editor.state.doc.nodesBetween(from, to, (node) => {
      if (!node.marks) {
        return
      }

      node.marks.forEach((mark) => {
        if (mark.type === ttsMarkType) {
          const nextConfig = getTTSMarkConfigFromAttributes(mark.attrs, fieldKeyMap)
          if (nextConfig) {
            currentConfig = nextConfig
          }
        }
      })
    })

    if (!currentConfig) {
      try {
        currentConfig = getTTSMarkConfigFromAttributes(editor.getAttributes(TTS_MARK_NAME), fieldKeyMap)
      } catch {
        currentConfig = null
      }
    }

    return currentConfig || {}
  }, [editor, getProviderContext])

  const getCurrentSelectionContextConfig = useCallback(() => {
    if (!editor || !activeProvider) {
      return {}
    }

    const { providerMeta } = getProviderContext()
    const selectionFilter = providerMeta
      ? { provider: activeProvider, pluginId: providerMeta.pluginId }
      : undefined
    const { $from } = editor.state.selection
    const cardConfig = getTTSSelectionConfig($from.parent?.attrs?.voice, selectionFilter)
    const inlineVoiceValue = getActiveTTSMentionValueBeforeOffset($from.parent, $from.parentOffset)
    const inlineVoiceConfig = getTTSSelectionConfig(inlineVoiceValue, selectionFilter)

    return {
      ...(cardConfig || {}),
      ...(inlineVoiceConfig || {}),
    }
  }, [activeProvider, editor, getProviderContext])

  useEffect(() => {
    let cancelled = false

    if (!activeProvider || !state.isOpen) {
      setFields((prev) => (prev.length ? [] : prev))
      return
    }

    const { providerMeta, segmentFields } = getProviderContext()
    if (!providerMeta || !segmentFields.length) {
      setFields((prev) => (prev.length ? [] : prev))
      return
    }

    const runtimeConfig = pluginStore.getRuntimeTTSConfiguration(activeProvider) || {}
    const selectionContextConfig = state.contextConfig || {}
    const segmentConfig = state.config || {}
    const mergedConfig = {
      ...runtimeConfig,
      ...selectionContextConfig,
      ...segmentConfig,
    }

    void Promise.all(segmentFields.map(async (field) => {
      const result = await getProviderEditorFieldOptions({
        providerMeta,
        field,
        config: mergedConfig,
        scope: 'segment',
      })
      const value = normalizeFieldValue(field, segmentConfig[field.key])
      const nextOptions = mapFieldOptions(providerMeta.pluginId, field, result.options)

      if (!nextOptions.length && value === null) {
        return null
      }

        return {
          key: field.key,
          label: translatePluginText(providerMeta.pluginId, field.label, field.label),
          type: field.type,
          role: field.role,
          value,
        options: nextOptions,
      } satisfies TTSSegmentFieldControl
    }))
      .then((results) => {
        if (cancelled) {
          return
        }

        const nextFields = results.filter(Boolean) as TTSSegmentFieldControl[]
        setFields((prev) => (isSameControls(nextFields, prev) ? prev : nextFields))
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        setFields((prev) => (prev.length ? [] : prev))
      })

    return () => {
      cancelled = true
    }
  }, [activeProvider, getProviderContext, mapFieldOptions, options?.configKey, state.config, state.contextConfig, state.isOpen])

  const calculatePosition = useCallback((): { x: number; y: number } => {
    if (!editor) return { x: 0, y: 0 }

    const { from, to } = editor.state.selection
    return getMiddleSelectionPosition(editor, from, to)
  }, [editor])

  const isValidSelection = useCallback((): boolean => {
    if (!editor) return false

    const { from, to, empty } = editor.state.selection
    if (empty) return false
    if (to - from < 1) return false

    return true
  }, [editor])

  const updateMenuState = useCallback(() => {
    if (!editor) return

    const shouldShow = isValidSelection()

    if (shouldShow) {
      const { from, to } = editor.state.selection
      savedSelectionRef.current = { from, to }

      const position = calculatePosition()
      const config = getCurrentConfig()
      const contextConfig = getCurrentSelectionContextConfig()
      const nextConfigKey = stableSerializeConfig(config)
      const nextContextConfigKey = stableSerializeConfig(contextConfig)

      setState((prev) => {
        const prevConfigKey = stableSerializeConfig(prev.config)
        const prevContextConfigKey = stableSerializeConfig(prev.contextConfig)
        if (
          prev.isOpen
          && prev.position.x === position.x
          && prev.position.y === position.y
          && prevConfigKey === nextConfigKey
          && prevContextConfigKey === nextContextConfigKey
        ) {
          return prev
        }

        return {
          isOpen: true,
          position,
          config,
          contextConfig,
        }
      })
    } else {
      savedSelectionRef.current = null
      setState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev))
    }
  }, [calculatePosition, editor, getCurrentConfig, getCurrentSelectionContextConfig, isValidSelection])

  const withSavedSelection = useCallback((callback: () => void) => {
    if (!editor || !savedSelectionRef.current) {
      callback()
      return
    }

    const { from, to } = savedSelectionRef.current
    editor.chain().focus().setTextSelection({ from, to }).run()
    callback()
  }, [editor])

  const setFieldValue = useCallback((fieldKey: string, value: number | string | null) => {
    if (!editor) {
      return
    }

    const { fieldKeyMap, segmentFields } = getProviderContext()
    const field = segmentFields.find((item) => item.key === fieldKey)
    const normalizedValue = normalizeFieldValue(field || { role: undefined }, value)

    withSavedSelection(() => {
      const currentConfig = getCurrentConfig()
      const nextConfig = {
        ...currentConfig,
      }

      if (normalizedValue === null) {
        delete nextConfig[fieldKey]
      } else {
        nextConfig[fieldKey] = normalizedValue
      }

      const nextAttributes = buildTTSMarkAttributesFromConfig(nextConfig, fieldKeyMap)
      if (!nextAttributes.config) {
        editor.chain().unsetMark(TTS_MARK_NAME).run()
      } else {
        editor.chain().setMark(TTS_MARK_NAME, nextAttributes).run()
      }
    })

    setState((prev) => {
      const nextConfig = {
        ...prev.config,
      }

      if (normalizedValue === null) {
        delete nextConfig[fieldKey]
      } else {
        nextConfig[fieldKey] = normalizedValue
      }

      return {
        ...prev,
        config: nextConfig,
      }
    })
  }, [editor, getCurrentConfig, getProviderContext, withSavedSelection])

  const clearMark = useCallback(() => {
    if (!editor) {
      return
    }

    withSavedSelection(() => {
      editor.chain().unsetMark(TTS_MARK_NAME).run()
    })

    setState((prev) => ({ ...prev, config: {} }))
  }, [editor, withSavedSelection])

  const closeMenu = useCallback(() => {
    savedSelectionRef.current = null
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      setTimeout(updateMenuState, 0)
    }

    editor.on('selectionUpdate', handleSelectionUpdate)
    editor.on('update', handleSelectionUpdate)

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
      editor.off('update', handleSelectionUpdate)
    }
  }, [editor, updateMenuState])

  useEffect(() => {
    if (!editor || !state.isOpen) {
      return
    }

    const ownerDocument = editor.view.dom.ownerDocument
    const isMenuInteractionTarget = (target: EventTarget | null) => {
      if (isNodeTarget(target) && menuRef.current?.contains(target)) {
        return true
      }

      return isElementTarget(target) && !!target.closest(RADIX_DROPDOWN_SELECTOR)
    }

    const shouldNativeSelectionKeepMenu = () => {
      const selection = ownerDocument.getSelection()
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return false
      }

      return editor.view.dom.contains(selection.anchorNode) || editor.view.dom.contains(selection.focusNode)
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (isMenuInteractionTarget(event.target)) {
        suppressSelectionCloseUntilRef.current = Date.now() + 400
        return
      }

      if (isNodeTarget(event.target) && !editor.view.dom.contains(event.target)) {
        closeMenu()
        return
      }

      window.setTimeout(updateMenuState, 0)
    }

    const handleSelectionChange = () => {
      window.setTimeout(() => {
        if (Date.now() < suppressSelectionCloseUntilRef.current) {
          return
        }

        if (!isValidSelection() || !shouldNativeSelectionKeepMenu()) {
          closeMenu()
        }
      }, 0)
    }

    ownerDocument.addEventListener('mousedown', handleMouseDown, true)
    ownerDocument.addEventListener('selectionchange', handleSelectionChange)

    return () => {
      ownerDocument.removeEventListener('mousedown', handleMouseDown, true)
      ownerDocument.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [closeMenu, editor, isValidSelection, state.isOpen, updateMenuState])

  return {
    ...state,
    menuRef,
    fields,
    setFieldValue,
    clearMark,
    closeMenu,
  }
}
