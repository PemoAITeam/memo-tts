import type { Editor } from '@tiptap/react'

import { parseStoredTTSSelection, getProviderEditorFields } from '@/app/lib/tts-plugin'
import { parseTTSMentionConfig } from '@/app/lib/tts-segments'
import { pluginStore } from '@/app/stores'

import { normalizeTTSMarkConfig } from './tts-mark'

interface ProviderIdentity {
  provider: string | null
  pluginId: string | null
}

interface ProviderSupportContext {
  allowedFieldKeys: Set<string>
  supportedRoles: Set<string>
}

function resolveProviderIdentity(value: unknown): ProviderIdentity | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, any>
  const provider = typeof candidate.provider === 'string' && candidate.provider.trim()
    ? candidate.provider
    : null
  const pluginId = typeof candidate.pluginId === 'string' && candidate.pluginId.trim()
    ? candidate.pluginId
    : null

  if (provider || pluginId) {
    return {
      provider,
      pluginId,
    }
  }

  const parsedSelection = parseStoredTTSSelection(candidate)
  if (!parsedSelection) {
    return null
  }

  return {
    provider: parsedSelection.provider,
    pluginId: parsedSelection.pluginId,
  }
}

function getProviderSupportContext(identity: ProviderIdentity | null): ProviderSupportContext | null {
  if (!identity?.provider && !identity?.pluginId) {
    return null
  }

  const providerMeta = identity.pluginId
    ? pluginStore.ttsProviders.find((item) => item.pluginId === identity.pluginId)
      || (identity.provider ? pluginStore.findTTSProviderByValue(identity.provider) : undefined)
    : (identity.provider ? pluginStore.findTTSProviderByValue(identity.provider) : undefined)

  if (!providerMeta) {
    return null
  }

  const manifest = pluginStore.memoPlugins?.installedPluginsManifests?.[providerMeta.pluginId]
  const segmentFields = getProviderEditorFields(providerMeta, manifest)
    .filter((field) => field.scope.includes('segment') && field.role !== 'voice')
  const supportedRoles = segmentFields.reduce<string[]>((result, field) => {
    if (field.role) {
      result.push(field.role)
    }
    return result
  }, [])

  return {
    allowedFieldKeys: new Set(segmentFields.map((field) => field.key)),
    supportedRoles: new Set(supportedRoles),
  }
}

function shouldRemoveMark(
  attrs: Record<string, any> | null | undefined,
  supportContext: ProviderSupportContext
) {
  const config = normalizeTTSMarkConfig(attrs?.config)
  if (config) {
    return Object.keys(config).some((key) => !supportContext.allowedFieldKeys.has(key))
  }

  const hasSpeed = attrs?.speed !== undefined && attrs?.speed !== null && attrs.speed !== 1
  if (hasSpeed && !supportContext.supportedRoles.has('speed')) {
    return true
  }

  const hasEmotion = attrs?.emotion !== undefined && attrs?.emotion !== null && attrs.emotion !== 'none'
  if (hasEmotion && !supportContext.supportedRoles.has('emotion')) {
    return true
  }

  return false
}

export function sanitizeUnsupportedSegmentMarks(
  editor: Editor | null,
  fallbackProvider?: string
) {
  if (!editor) {
    return false
  }

  const ttsMarkType = editor.state.schema.marks.ttsMark
  if (!ttsMarkType) {
    return false
  }

  const fallbackIdentity = resolveProviderIdentity({ provider: fallbackProvider || null })
  const rangesToClean: Array<{ from: number; to: number }> = []

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'editorCard') {
      return true
    }

    const cardIdentity = resolveProviderIdentity(node.attrs?.voice) || fallbackIdentity
    let currentSupportContext = getProviderSupportContext(cardIdentity)

    node.forEach((child, offset) => {
      if (child.type.name === 'ttsMention') {
        const mentionConfig = parseTTSMentionConfig(child.attrs?.config)
        const mentionIdentity = resolveProviderIdentity(mentionConfig)
          || resolveProviderIdentity(child.attrs)
          || fallbackIdentity
        currentSupportContext = getProviderSupportContext(mentionIdentity)
        return
      }

      if (!child.isText || !child.marks?.length || !currentSupportContext) {
        return
      }

      const ttsMark = child.marks.find((mark) => mark.type === ttsMarkType)
      if (!ttsMark || !shouldRemoveMark(ttsMark.attrs, currentSupportContext)) {
        return
      }

      const from = pos + 1 + offset
      const to = from + child.nodeSize
      rangesToClean.push({ from, to })
    })

    return false
  })

  if (!rangesToClean.length) {
    return false
  }

  let tr = editor.state.tr

  rangesToClean.forEach(({ from, to }) => {
    tr = tr.removeMark(from, to, ttsMarkType)
  })

  if (!tr.docChanged) {
    return false
  }

  editor.view.dispatch(tr)
  return true
}
