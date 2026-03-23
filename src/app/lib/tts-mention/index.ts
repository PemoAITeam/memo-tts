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

export { TTSMark, TTS_SPEED_OPTIONS, SPEED_LABEL_MAP, EMOTION_LABEL_MAP, getSpeedLabel, getEmotionLabel } from './tts-mark'
export type { TTSMarkOptions, EmotionOption } from './tts-mark'

export { useTTSBubbleMenu } from './use-tts-bubble-menu'
export type { TTSBubbleMenuState } from './use-tts-bubble-menu'

export { useTTSMentionMenu } from './use-tts-mention-menu'
export type { TTSMenuState } from './use-tts-mention-menu'

export type {
  MenuItemType,
  GenderType,
  TTSMenuGroup,
  TTSFieldOption,
  TTSSegmentFieldControl,
  TTSMenuState as TTSMenuStateType,
} from './types'

export {
  getProviders,
  getBreadcrumb,
  getMenuItems,
  getLoadingMenuItems,
  getNextMenuPath,
  buildSelectedVoiceConfig,
} from './data'

export { TTSMentionPluginKey, createTTSMentionPlugin } from './tts-mention-plugin'
