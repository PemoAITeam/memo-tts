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

// TTS Speed 扩展
export {
  TTSSpeed,
  TTSSpeedNode,
  TTSSpeedPluginKey,
  createTTSSpeedPlugin,
  SPEED_SUB_OPTIONS,
  getSpeedMenuLevel1,
  getSpeedSubMenu,
  getEmotionSubMenu,
} from './tts-speed'
export type { TTSSpeedOptions, TTSSpeedPluginOptions, SpeedMenuItem, SpeedMenuItemType, SpeedMenuPath } from './tts-speed'

// Hook
export { useTTSMentionMenu } from './use-tts-mention-menu'
export type { TTSMenuState } from './use-tts-mention-menu'

// Speed Hook
export { useTTSSpeedMenu } from './use-tts-speed-menu'
export type { TTSSpeedMenuState } from './use-tts-speed-menu'

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
