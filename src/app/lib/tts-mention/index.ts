// TTS Mention 扩展 - 简化版（不依赖 @tiptap/suggestion）
export {
  TTSMentionSimple,
  TTSMentionNode,
  TTSMentionMark,
  selectVoice,
  closeMentionMenu,
  isMentionMenuActive,
  getCurrentQuery,
  getCurrentRange,
} from './tts-mention-simple'
export type { TTSMentionSimpleOptions, SelectedVoiceConfig, MenuPath, TTSMenuItem, TTSProvider } from './tts-mention-simple'

// Hook
export { useTTSMentionMenu } from './use-tts-mention-menu'
export type { TTSMenuState } from './use-tts-mention-menu'

// 类型定义
export type {
  MenuItemType,
  GenderType,
  TTSMenuGroup,
  EdgeLanguageOption,
  EdgeVoiceOption,
  VolcanoSceneOption,
  VolcanoEmotionOption,
  VolcanoVoiceOption,
  OpenAIModelOption,
  OpenAIVoiceOption,
  TTSMenuState as TTSMenuStateType,
} from './types'

// 数据源
export {
  getProviders,
  getEdgeLanguages,
  getEdgeVoices,
  getVolcanoScenes,
  getVolcanoEmotions,
  getVolcanoVoices,
  getOpenAIModels,
  openAIVoices,
  getBreadcrumb,
  getMenuItems,
} from './data'

// Plugin
export { TTSMentionPluginKey, createTTSMentionPlugin } from './tts-mention-plugin'
