import i18n from 'i18next'

import { translatePluginOptionLabel, translatePluginText } from '@/app/lib/plugin-i18n'
import { pluginStore } from '@/app/stores'
import {
  findProviderEditorField,
  getFieldDisplayValue,
  getProviderFieldChoiceOptions,
  type TTSConfigScope,
  type MemoTTSEditorRole,
} from '@/app/lib/tts-plugin'

import type { MenuPath, SelectedVoiceConfig, TTSMenuItem } from './types'

type PathRole = Extract<MemoTTSEditorRole, 'language' | 'scene' | 'model'>

const PROVIDER_ICON_MAP: Array<{ match: RegExp; icon: string }> = [
  { match: /edge/i, icon: 'TbBrandEdge' },
  { match: /openai/i, icon: 'TbBrandOpenai' },
  { match: /volc|volcano/i, icon: 'TbVolcano' },
]

function resolveProviderIcon(provider: string, pluginId?: string) {
  const source = `${provider} ${pluginId || ''}`
  return PROVIDER_ICON_MAP.find((item) => item.match.test(source))?.icon || 'TbMicrophone'
}

function translateOptionLabel(pluginId: string | undefined, label: string, useI18n?: boolean) {
  return translatePluginOptionLabel(pluginId, label, useI18n)
}

function getProviderContext(providerValue?: string) {
  const providerMeta = providerValue
    ? pluginStore.findTTSProviderByValue(providerValue)
    : undefined
  const manifest = providerMeta
    ? pluginStore.findManifestByProviderValue(providerValue!)
    : undefined

  return {
    providerMeta,
    manifest,
  }
}

function getProviderRuntimeConfig(providerValue: string) {
  const { providerMeta, manifest } = getProviderContext(providerValue)
  if (!providerMeta || !manifest) {
    return {}
  }

  const version = pluginStore.memoPlugins?.localPlugins?.versions?.[providerMeta.pluginId]
  const storedConfig = version
    ? pluginStore.memoPlugins?.pluginsConfigurations?.[`${providerMeta.pluginId}@${version}`] || {}
    : {}
  const defaultsConfig = manifest.defaultsConfiguration || {}
  const runtimeConfig = pluginStore.getRuntimeTTSConfiguration(providerValue) || {}

  return {
    ...defaultsConfig,
    ...storedConfig,
    ...runtimeConfig,
  }
}

function getField(providerValue: string, role: MemoTTSEditorRole, scope: 'segment' | 'card' | 'global' = 'segment') {
  const { providerMeta, manifest } = getProviderContext(providerValue)
  return findProviderEditorField(providerMeta, manifest, role, scope)
}

function getFieldByScopes(
  providerValue: string,
  role: MemoTTSEditorRole,
  scopes: TTSConfigScope[]
) {
  for (const scope of scopes) {
    const field = getField(providerValue, role, scope)
    if (field) {
      return field
    }
  }

  const { providerMeta, manifest } = getProviderContext(providerValue)
  return findProviderEditorField(providerMeta, manifest, role)
}

function getPathValue(path: MenuPath, role: PathRole) {
  if (role === 'language') {
    return path.language
  }
  if (role === 'scene') {
    return path.scene
  }
  return path.model
}

function setPathValue(path: MenuPath, role: PathRole, value: string) {
  if (role === 'language') {
    return { ...path, language: value }
  }
  if (role === 'scene') {
    return { ...path, scene: value as any }
  }
  return { ...path, model: value }
}

function filterMenuItems(query: string | undefined, items: TTSMenuItem[]) {
  if (!query?.trim()) {
    return items
  }

  const normalizedQuery = query.toLowerCase().trim()
  return items.filter((item) =>
    item.label.toLowerCase().includes(normalizedQuery)
    || item.labelEn?.toLowerCase().includes(normalizedQuery)
  )
}

function createStatusItem(id: string, label: string, data?: Record<string, any>): TTSMenuItem {
  return {
    id,
    type: 'voice',
    label,
    disabled: true,
    data,
  }
}

export function getLoadingMenuItems(label?: string): TTSMenuItem[] {
  return [createStatusItem('tts-menu-loading', label || i18n.t('app.loading', { defaultValue: 'Loading...' }), { loading: true })]
}

function buildProviderPathConfig(providerValue: string, path: MenuPath) {
  const runtimeConfig = getProviderRuntimeConfig(providerValue)
  const config: Record<string, any> = {
    ...runtimeConfig,
  }

  ;(['language', 'scene', 'model'] as PathRole[]).forEach((role) => {
    const field = getFieldByScopes(providerValue, role, ['segment', 'card', 'global'])
    const value = getPathValue(path, role)

    if (field && value != null && value !== '') {
      config[field.key] = value
    }
  })

  return config
}

async function buildChoiceItems(
  providerValue: string,
  role: PathRole | 'voice',
  path: MenuPath,
  query?: string
): Promise<TTSMenuItem[]> {
  const { providerMeta, manifest } = getProviderContext(providerValue)
  const contextConfig = buildProviderPathConfig(providerValue, path)
  const { field, options } = await getProviderFieldChoiceOptions({
    providerMeta,
    manifest,
    role,
    scope: 'segment',
    config: contextConfig,
    query,
  })

  if (!field) {
    return []
  }

  return options.map((option) => {
    const translatedLabel = translateOptionLabel(providerMeta?.pluginId, option.label, field.useI18nOptions)
    const menuType = role === 'voice' ? 'voice' : role

    return {
      id: `${providerValue}-${field.key}-${option.value}`,
      type: menuType,
      label: translatedLabel,
      labelEn: String(option.value).toLowerCase(),
      data: {
        provider: providerValue,
        fieldKey: field.key,
        role,
        value: option.value,
        label: translatedLabel,
      },
    } satisfies TTSMenuItem
  })
}

function buildUnavailableVoiceItem(providerValue: string): TTSMenuItem[] {
  return [{
    id: `${providerValue}-segment-voice-unavailable`,
    type: 'voice',
    label: i18n.t('tts.no results', { defaultValue: 'No segment voice options' }),
    disabled: true,
    data: {
      provider: providerValue,
      unavailable: true,
    },
  }]
}

export function getProviders(): TTSMenuItem[] {
  return pluginStore.ttsProviders.map((provider) => ({
    id: provider.pluginId,
    type: 'provider',
    label: translatePluginText(provider.pluginId, provider.label, provider.label || provider.provider),
    labelEn: provider.provider.toLowerCase(),
    icon: resolveProviderIcon(provider.provider, provider.pluginId),
    disabled: provider.disabled,
    data: {
      provider: provider.provider,
      pluginId: provider.pluginId,
    },
  }))
}

export async function getMenuItems(path: MenuPath, query?: string, initialProvider?: string): Promise<TTSMenuItem[]> {
  const effectiveProvider = initialProvider || path.provider

  if (!effectiveProvider) {
    return filterMenuItems(query, getProviders())
  }

  for (const role of ['language', 'scene', 'model'] as PathRole[]) {
    if (getPathValue(path, role)) {
      continue
    }

    const roleItems = await buildChoiceItems(effectiveProvider, role, path, query)
    if (roleItems.length) {
      return filterMenuItems(query, roleItems)
    }
  }

  const voiceItems = await buildChoiceItems(effectiveProvider, 'voice', path, query)
  return filterMenuItems(query, voiceItems.length ? voiceItems : buildUnavailableVoiceItem(effectiveProvider))
}

export function getBreadcrumb(path: MenuPath): string[] {
  const crumbs: string[] = []
  if (!path.provider) {
    return crumbs
  }

  const { providerMeta } = getProviderContext(path.provider)
  crumbs.push(translatePluginText(providerMeta?.pluginId, providerMeta?.label, providerMeta?.label || path.provider))

  ;(['language', 'scene', 'model'] as PathRole[]).forEach((role) => {
    const value = getPathValue(path, role)
    if (value == null || value === '') {
      return
    }

    const field = getFieldByScopes(path.provider!, role, ['segment', 'card', 'global'])
    crumbs.push(getFieldDisplayValue(field, value, providerMeta?.pluginId))
  })

  return crumbs
}

export function getNextMenuPath(path: MenuPath, item: TTSMenuItem): MenuPath | undefined {
  if (item.disabled) {
    return undefined
  }

  if (item.type === 'provider') {
    return { provider: item.data?.provider as string }
  }

  if (item.type === 'language') {
    return setPathValue(path, 'language', String(item.data?.value ?? item.data?.code ?? ''))
  }

  if (item.type === 'scene') {
    return setPathValue(path, 'scene', String(item.data?.value ?? item.data?.scene ?? ''))
  }

  if (item.type === 'model') {
    return setPathValue(path, 'model', String(item.data?.value ?? item.data?.model ?? ''))
  }

  return undefined
}

export function buildSelectedVoiceConfig(path: MenuPath, item: TTSMenuItem): SelectedVoiceConfig | undefined {
  if (item.type !== 'voice' || item.disabled) {
    return undefined
  }

  const provider = path.provider || item.data?.provider
  if (!provider) {
    return undefined
  }

  const { providerMeta } = getProviderContext(provider)
  const voiceField = getFieldByScopes(provider, 'voice', ['segment', 'card', 'global'])
  if (!providerMeta || !voiceField) {
    return undefined
  }

  const config: Record<string, any> = {}
  const runtimeConfig = getProviderRuntimeConfig(provider)

  const languageField = getFieldByScopes(provider, 'language', ['segment', 'card', 'global'])
  const sceneField = getFieldByScopes(provider, 'scene', ['segment', 'card', 'global'])
  const modelField = getFieldByScopes(provider, 'model', ['segment', 'card', 'global'])

  if (languageField && path.language) {
    config[languageField.key] = path.language
  } else if (languageField && runtimeConfig[languageField.key] != null) {
    config[languageField.key] = runtimeConfig[languageField.key]
  }
  if (sceneField && path.scene) {
    config[sceneField.key] = path.scene
  } else if (sceneField && runtimeConfig[sceneField.key] != null) {
    config[sceneField.key] = runtimeConfig[sceneField.key]
  }
  if (modelField && path.model) {
    config[modelField.key] = path.model
  } else if (modelField && runtimeConfig[modelField.key] != null) {
    config[modelField.key] = runtimeConfig[modelField.key]
  }

  const voiceValue = item.data?.value
  if (voiceValue == null) {
    return undefined
  }

  config[voiceField.key] = voiceValue

  const selection: SelectedVoiceConfig = {
    provider,
    pluginId: providerMeta.pluginId,
    displayLabel: item.label,
    voiceLocalName: item.label,
    config,
    rawData: item.data,
  }

  const resolvedLanguage = path.language || (languageField ? runtimeConfig[languageField.key] : undefined)
  const resolvedScene = path.scene || (sceneField ? runtimeConfig[sceneField.key] : undefined)
  const resolvedModel = path.model || (modelField ? runtimeConfig[modelField.key] : undefined)

  if (resolvedLanguage != null && resolvedLanguage !== '') {
    selection.lang = String(resolvedLanguage)
  }
  if (resolvedScene != null && resolvedScene !== '') {
    selection.scene = String(resolvedScene)
  }
  if (resolvedModel != null && resolvedModel !== '') {
    selection.model = String(resolvedModel)
  }

  if (/voicetype/i.test(voiceField.key)) {
    selection.voiceType = String(voiceValue)
  } else if (/voicename/i.test(voiceField.key)) {
    selection.voiceName = String(voiceValue)
  } else {
    selection.voice = String(voiceValue)
  }

  return selection
}
