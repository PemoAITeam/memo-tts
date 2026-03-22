import i18n from 'i18next'

type PluginI18nTranslations = Record<string, any>
type PluginI18nBundle = Record<string, PluginI18nTranslations | undefined>

function normalizeLanguageCode(languageCode: string) {
  const normalized = languageCode.trim().replace(/-/g, '_').toLowerCase()
  const candidates = new Set<string>()

  if (!normalized) {
    return []
  }

  candidates.add(normalized)

  const [baseLanguage, region] = normalized.split('_')
  if (baseLanguage === 'zh') {
    if (region === 'tw' || region === 'hk' || region === 'hant') {
      candidates.add('zh_tw')
    } else if (!region || region === 'cn' || region === 'hans') {
      candidates.add('zh')
    }
  } else if (baseLanguage) {
    candidates.add(baseLanguage)
  }

  return Array.from(candidates)
}

export function getPluginTranslationKey(pluginId?: string, key?: string) {
  if (!key) {
    return ''
  }

  if (!pluginId || key.startsWith(`${pluginId}.`)) {
    return key
  }

  return `${pluginId}.${key}`
}

export function translatePluginText(pluginId: string | undefined, key: string | undefined, defaultValue?: string) {
  if (!key) {
    return defaultValue || ''
  }

  const translationKey = getPluginTranslationKey(pluginId, key)
  return i18n.t(translationKey as any, {
    defaultValue: defaultValue ?? key,
  }) as string
}

export function translatePluginOptionLabel(
  pluginId: string | undefined,
  label: string,
  useI18n?: boolean
) {
  void useI18n
  return translatePluginText(pluginId, label, label)
}

export function registerPluginI18nBundle(
  pluginId: string,
  bundle?: PluginI18nBundle
) {
  if (!pluginId || !bundle) {
    return
  }

  Object.entries(bundle).forEach(([languageCode, translations]) => {
    if (!translations || typeof translations !== 'object' || !Object.keys(translations).length) {
      return
    }

    normalizeLanguageCode(languageCode).forEach((normalizedLanguageCode) => {
      i18n.addResourceBundle(
        normalizedLanguageCode,
        'translation',
        { [pluginId]: translations },
        true,
        true
      )
    })
  })
}
