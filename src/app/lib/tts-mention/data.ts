import { TTSMenuItem, MenuPath } from './types'
import { lang, voices } from '../tts'
import { VolcanoScenes, VolcanoVoiceType, VolcanoEmotion, VolcanoSceneEmotion } from '../volcano.config'

// ============ 服务提供商列表 ============
export const getProviders = (): TTSMenuItem[] => [
  {
    id: 'edge',
    type: 'provider',
    label: 'Edge TTS',
    labelEn: 'edge',
    icon: 'TbBrandEdge',
    data: { provider: 'Edge' }
  },
  {
    id: 'volcano',
    type: 'provider',
    label: '火山引擎',
    labelEn: 'volcano',
    icon: 'TbVolcano',
    data: { provider: 'Volcano' }
  },
  {
    id: 'openai',
    type: 'provider',
    label: 'OpenAI',
    labelEn: 'openai',
    icon: 'TbBrandOpenai',
    data: { provider: 'OpenAI' }
  }
]

// ============ Edge TTS 数据 ============
export const getEdgeLanguages = (): TTSMenuItem[] => {
  return (Object.keys(lang) as Array<keyof typeof lang>).map(code => ({
    id: `lang-${code}`,
    type: 'language' as const,
    label: lang[code],
    labelEn: code.toLowerCase(),
    data: { code }
  }))
}

export const getEdgeVoices = (languageCode: string): TTSMenuItem[] => {
  const locale = languageCode.replace(/_/g, '-').toLowerCase()
  return voices
    .filter(v => v.locale.toLowerCase() === locale)
    .map(v => ({
      id: `voice-${v.shortName}`,
      type: 'voice' as const,
      label: v.properties.LocalName,
      labelEn: v.properties.DisplayName?.toLowerCase() || '',
      gender: v.properties.Gender as 'Male' | 'Female',
      data: {
        shortName: v.shortName,
        locale: v.locale,
        properties: v.properties
      }
    }))
}

// ============ 火山引擎数据 ============
export const getVolcanoScenes = (): TTSMenuItem[] => {
  return VolcanoScenes.map(scene => ({
    id: `scene-${scene.value}`,
    type: 'scene' as const,
    label: scene.label,
    labelEn: scene.value,
    data: { scene: scene.value }
  }))
}

export const getVolcanoEmotions = (scene: string): TTSMenuItem[] => {
  const emotions = VolcanoSceneEmotion[scene as keyof typeof VolcanoSceneEmotion] || []
  return emotions.map((emotion: { label: string; value: string }) => ({
    id: `emotion-${emotion.value}`,
    type: 'emotion' as const,
    label: emotion.label,
    labelEn: emotion.value,
    data: { emotion: emotion.value }
  }))
}

export const getVolcanoVoices = (scene: string): TTSMenuItem[] => {
  const voices = VolcanoVoiceType[scene as keyof typeof VolcanoVoiceType] || []
  return voices.map(voice => ({
    id: `voice-${voice.value}`,
    type: 'voice' as const,
    label: voice.label,
    labelEn: voice.value.toLowerCase(),
    gender: voice.gender as 'male' | 'female',
    data: {
      voiceType: voice.value,
      label: voice.label
    }
  }))
}

// 根据语音获取支持的情感
export const getVolcanoVoiceEmotions = (voiceType: string): TTSMenuItem[] => {
  const emotions = VolcanoEmotion[voiceType] || []
  return emotions.map((emotion: { label: string; value: string }) => ({
    id: `emotion-${emotion.value}`,
    type: 'emotion' as const,
    label: emotion.label,
    labelEn: emotion.value,
    data: { emotion: emotion.value }
  }))
}

// ============ OpenAI 数据 ============
export const getOpenAIModels = (): TTSMenuItem[] => [
  {
    id: 'model-tts-1',
    type: 'model',
    label: '标准模型',
    labelEn: 'tts-1',
    data: { model: 'tts-1' }
  },
  {
    id: 'model-tts-1-hd',
    type: 'model',
    label: '高清模型',
    labelEn: 'tts-1-hd',
    data: { model: 'tts-1-hd' }
  }
]

export const openAIVoices: TTSMenuItem[] = [
  { id: 'voice-alloy', type: 'voice', label: 'Alloy', labelEn: 'alloy', data: { voice: 'alloy' } },
  { id: 'voice-echo', type: 'voice', label: 'Echo', labelEn: 'echo', data: { voice: 'echo' } },
  { id: 'voice-fable', type: 'voice', label: 'Fable', labelEn: 'fable', data: { voice: 'fable' } },
  { id: 'voice-onyx', type: 'voice', label: 'Onyx', labelEn: 'onyx', data: { voice: 'onyx' } },
  { id: 'voice-nova', type: 'voice', label: 'Nova', labelEn: 'nova', data: { voice: 'nova' } },
  { id: 'voice-shimmer', type: 'voice', label: 'Shimmer', labelEn: 'shimmer', data: { voice: 'shimmer' } }
]

// ============ 根据路径获取菜单项 ============
// initialProvider: 如果提供，跳过服务商选择，直接进入该服务商的菜单
export function getMenuItems(path: MenuPath, query?: string, initialProvider?: 'Edge' | 'Volcano' | 'OpenAI'): TTSMenuItem[] {
  let items: TTSMenuItem[] = []

  // 如果提供了初始服务商，跳过服务商选择
  const effectiveProvider = initialProvider || path.provider

  // 第一级：选择服务提供商（如果没有初始服务商）
  if (!effectiveProvider) {
    items = getProviders()
  }
  // Edge TTS 路径
  else if (effectiveProvider === 'Edge') {
    if (!path.language) {
      items = getEdgeLanguages()
    } else {
      items = getEdgeVoices(path.language)
    }
  }
  // Volcano 路径
  else if (effectiveProvider === 'Volcano') {
    if (!path.scene) {
      items = getVolcanoScenes()
    } else {
      items = getVolcanoVoices(path.scene)
    }
  }
  // OpenAI 路径
  else if (effectiveProvider === 'OpenAI') {
    if (!path.model) {
      items = getOpenAIModels()
    } else {
      items = openAIVoices
    }
  }

  // 应用搜索过滤
  if (query && query.trim()) {
    const q = query.toLowerCase().trim()
    items = items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      (item.labelEn && item.labelEn.toLowerCase().includes(q))
    )
  }

  return items
}

// ============ 获取路径的面包屑 ============
export function getBreadcrumb(path: MenuPath): string[] {
  const crumbs: string[] = []

  if (path.provider) {
    const provider = getProviders().find(p => p.data?.provider === path.provider)
    crumbs.push(provider?.label || path.provider)
  }
  if (path.language) {
    crumbs.push(lang[path.language as keyof typeof lang] || path.language)
  }
  if (path.scene) {
    const scene = VolcanoScenes.find(s => s.value === path.scene)
    crumbs.push(scene?.label || path.scene)
  }
  if (path.model) {
    crumbs.push(path.model)
  }

  return crumbs
}
