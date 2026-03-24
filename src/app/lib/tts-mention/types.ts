export type TTSProvider = string

export type MenuItemType = 'provider' | 'language' | 'scene' | 'emotion' | 'voice' | 'model'

export type GenderType = 'Male' | 'Female' | 'male' | 'female'

export interface TTSMenuItem {
  id: string
  type: MenuItemType
  label: string
  labelEn?: string
  icon?: string
  gender?: GenderType
  disabled?: boolean
  data?: Record<string, any>
}

export interface TTSMenuGroup extends TTSMenuItem {
  children: TTSMenuItem[] | (() => TTSMenuItem[])
}

export interface TTSFieldOption {
  id: string
  type: string
  label: string
  value?: number | string
  description?: string
  icon?: string
  fieldKey?: string
  role?: string
}

export interface TTSSegmentFieldControl {
  key: string
  label: string
  type: string
  role?: string
  value: number | string | null
  options: TTSFieldOption[]
}

export interface SelectedVoiceConfig {
  provider: TTSProvider
  pluginId?: string
  displayLabel?: string
  config?: Record<string, any>
  lang?: string
  voiceName?: string
  voiceLocalName?: string
  scene?: string
  emotion?: string
  voiceType?: string
  model?: string
  voice?: string
  rate?: number
  speed?: number | string
  rawData?: Record<string, any>
}

export interface MenuPath {
  provider?: TTSProvider
  language?: string
  scene?: string
  emotion?: string
  model?: string
}

export interface TTSMenuState {
  level: 0 | 1 | 2 | 3
  path: MenuPath
  query: string
  items: TTSMenuItem[]
  selectedIndex: number
}
