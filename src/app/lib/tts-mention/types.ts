import { ScenesType } from '../volcano.config'

// TTS 服务提供商
export type TTSProvider = 'Edge' | 'Volcano' | 'OpenAI'

// 菜单项类型
export type MenuItemType = 'provider' | 'language' | 'scene' | 'emotion' | 'voice' | 'model'

// 性别类型
export type GenderType = 'Male' | 'Female' | 'male' | 'female'

// 基础菜单项接口
export interface TTSMenuItem {
  id: string
  type: MenuItemType
  label: string
  labelEn?: string  // 英文标签用于搜索
  icon?: string     // 图标名称
  gender?: GenderType
  disabled?: boolean
  data?: Record<string, any>  // 额外数据
}

// 带子菜单的菜单项
export interface TTSMenuGroup extends TTSMenuItem {
  children: TTSMenuItem[] | (() => TTSMenuItem[])  // 支持懒加载
}

// Edge 语言选项
export interface EdgeLanguageOption extends TTSMenuItem {
  type: 'language'
  code: string  // 如 'ZH_CN'
}

// Edge 语音选项
export interface EdgeVoiceOption extends TTSMenuItem {
  type: 'voice'
  shortName: string
  locale: string
  properties: {
    DisplayName: string
    LocalName: string
    Gender: 'Male' | 'Female'
  }
}

// 火山引擎场景选项
export interface VolcanoSceneOption extends TTSMenuItem {
  type: 'scene'
  value: ScenesType
}

// 火山引擎情感选项
export interface VolcanoEmotionOption extends TTSMenuItem {
  type: 'emotion'
  value: string
}

// 火山引擎语音选项
export interface VolcanoVoiceOption extends TTSMenuItem {
  type: 'voice'
  value: string  // voice_type
  gender: 'male' | 'female'
}

// OpenAI 模型选项
export interface OpenAIModelOption extends TTSMenuItem {
  type: 'model'
  value: 'tts-1' | 'tts-1-hd'
}

// OpenAI 语音选项
export interface OpenAIVoiceOption extends TTSMenuItem {
  type: 'voice'
  value: string
}

// 选中的语音配置
export interface SelectedVoiceConfig {
  provider: TTSProvider
  // Edge 配置
  lang?: string
  voiceName?: string
  voiceLocalName?: string
  // Volcano 配置
  scene?: ScenesType
  emotion?: string
  voiceType?: string
  // OpenAI 配置
  model?: string
  voice?: string
  // 通用
  rate?: number
  speed?: string
  target?: 'original' | 'translate'
  // 原始数据
  rawData?: Record<string, any>
}

// 菜单层级路径
export interface MenuPath {
  provider?: TTSProvider
  language?: string
  scene?: ScenesType
  emotion?: string
  model?: string
}

// 菜单状态
export interface TTSMenuState {
  level: 0 | 1 | 2 | 3  // 当前层级
  path: MenuPath
  query: string
  items: TTSMenuItem[]
  selectedIndex: number
}
