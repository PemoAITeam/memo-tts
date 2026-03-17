/**
 * TTS Bubble Menu Component
 * 选中文本后显示的悬浮菜单，用于设置速度和情绪
 */

import { forwardRef, ForwardedRef } from 'react'
import { TbGaugeFilled, TbMoodSmile, TbX } from 'react-icons/tb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { TTS_SPEED_OPTIONS, EMOTION_LABEL_MAP } from '@/app/lib/tts-mention/tts-mark'
import { SpeedMenuItem } from '@/app/lib/tts-mention/tts-speed'
import { cn } from '@/app/lib/utils'

interface TTSBubbleMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  speed: number | null
  emotion: string | null
  emotionOptions: SpeedMenuItem[]
  onSpeedChange: (speed: number | null) => void
  onEmotionChange: (emotion: string | null) => void
  onClear: () => void
}

export const TTSBubbleMenu = forwardRef<HTMLDivElement, TTSBubbleMenuProps>(
  (
    {
      isOpen,
      position,
      speed,
      emotion,
      emotionOptions,
      onSpeedChange,
      onEmotionChange,
      onClear,
    },
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    if (!isOpen) return null

    // 获取当前速度显示文本
    const getSpeedLabel = () => {
      if (speed === null || speed === 1) return '速度'
      const opt = TTS_SPEED_OPTIONS.find(o => o.value === speed)
      return opt ? opt.label : '速度'
    }

    // 获取当前情绪显示文本
    const getEmotionLabel = () => {
      if (emotion === null || emotion === 'none') return '情绪'
      // 先使用映射表
      const mapped = EMOTION_LABEL_MAP[emotion]
      if (mapped) return mapped
      // 再从选项中查找
      const opt = emotionOptions.find(o => o.value === emotion)
      return opt ? opt.label : '情绪'
    }

    // 是否支持情绪（只有选项不为空时才显示）
    const supportsEmotion = emotionOptions.length > 0

    // 是否有有效设置（1倍速不算设置，不支持情绪时忽略情绪设置）
    const hasSettings = (speed !== null && speed !== 1) || (supportsEmotion && emotion !== null && emotion !== 'none')

    return (
      <div
        ref={ref}
        className="fixed z-[9999] tts-bubble-menu"
        style={{
          left: Math.min(position.x - 100, window.innerWidth - 250),
          top: Math.max(position.y - 50, 10),
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 p-1 bg-popover border rounded-lg shadow-md animate-in fade-in-0 zoom-in-95">
          {/* 情绪选择 - 只有支持时才显示 */}
          {supportsEmotion && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-accent transition-colors",
                      emotion !== null && emotion !== 'none' && "text-purple-600 dark:text-purple-400"
                    )}
                  >
                    <TbMoodSmile className="w-4 h-4" />
                    <span className="max-w-[60px] truncate">{getEmotionLabel()}</span>
                    <svg className="w-3 h-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[120px]">
                  {emotionOptions.map((opt) => {
                    // 使用映射表显示中文
                    const displayLabel = EMOTION_LABEL_MAP[opt.value as string] || opt.label
                    return (
                      <DropdownMenuItem
                        key={opt.id}
                        onClick={() => onEmotionChange(opt.value as string)}
                        className={cn(
                          emotion === opt.value && "bg-accent"
                        )}
                      >
                        {displayLabel}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="w-px h-4 bg-muted" />
            </>
          )}

          {/* 速度选择 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-accent transition-colors",
                  speed !== null && speed !== 1 && "text-purple-600 dark:text-purple-400"
                )}
              >
                <TbGaugeFilled className="w-4 h-4" />
                <span>{getSpeedLabel()}</span>
                <svg className="w-3 h-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[120px]">
              {TTS_SPEED_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => onSpeedChange(opt.value)}
                  className={cn(
                    speed === opt.value && "bg-accent"
                  )}
                >
                  <span>{opt.label}</span>
                  {opt.description && (
                    <span className="ml-auto text-xs text-muted-foreground">{opt.description}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 清除按钮 */}
          {hasSettings && (
            <>
              <div className="w-px h-4 bg-muted" />
              <button
                onClick={onClear}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                title="清除设置"
              >
                <TbX className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    )
  }
)

TTSBubbleMenu.displayName = 'TTSBubbleMenu'
