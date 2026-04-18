import { forwardRef, useCallback, useLayoutEffect, useRef, useState, type ForwardedRef } from 'react'
import {
  TbAdjustmentsHorizontal,
  TbBox,
  TbGaugeFilled,
  TbLanguage,
  TbMoodSmile,
  TbX,
} from 'react-icons/tb'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { EMOTION_LABEL_MAP } from '@/app/lib/tts-mention/tts-mark'
import type { TTSSegmentFieldControl } from '@/app/lib/tts-mention/types'
import { cn } from '@/app/lib/utils'

interface TTSBubbleMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  fields: TTSSegmentFieldControl[]
  onFieldChange: (fieldKey: string, value: number | string | null) => void
  onClear: () => void
}

const MENU_VIEWPORT_MARGIN = 10
const MENU_SELECTION_GAP = 8
const FALLBACK_MENU_SIZE = {
  width: 240,
  height: 40,
}

function getFieldIcon(role?: string) {
  switch (role) {
    case 'speed':
      return <TbGaugeFilled className="h-4 w-4" />
    case 'emotion':
      return <TbMoodSmile className="h-4 w-4" />
    case 'language':
      return <TbLanguage className="h-4 w-4" />
    case 'model':
      return <TbBox className="h-4 w-4" />
    default:
      return <TbAdjustmentsHorizontal className="h-4 w-4" />
  }
}

function getFieldValueLabel(field: TTSSegmentFieldControl) {
  if (field.value === null || field.value === undefined || field.value === '') {
    return field.label
  }

  if (field.role === 'emotion' && typeof field.value === 'string' && EMOTION_LABEL_MAP[field.value]) {
    return EMOTION_LABEL_MAP[field.value]
  }

  const option = field.options.find((item) => item.value === field.value)
  if (option) {
    return field.role === 'emotion' && typeof option.value === 'string' && EMOTION_LABEL_MAP[option.value]
      ? EMOTION_LABEL_MAP[option.value]
      : option.label
  }

  return String(field.value)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max))
}

export const TTSBubbleMenu = forwardRef<HTMLDivElement, TTSBubbleMenuProps>(
  (
    {
      isOpen,
      position,
      fields,
      onFieldChange,
      onClear,
    },
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const menuRef = useRef<HTMLDivElement | null>(null)
    const [menuSize, setMenuSize] = useState(FALLBACK_MENU_SIZE)

    const setMenuRef = useCallback((node: HTMLDivElement | null) => {
      menuRef.current = node

      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }, [ref])

    useLayoutEffect(() => {
      if (!isOpen) {
        return
      }

      const node = menuRef.current
      if (!node) {
        return
      }

      const updateMenuSize = () => {
        const rect = node.getBoundingClientRect()
        const nextSize = {
          width: rect.width || FALLBACK_MENU_SIZE.width,
          height: rect.height || FALLBACK_MENU_SIZE.height,
        }

        setMenuSize((prev) => (
          prev.width === nextSize.width && prev.height === nextSize.height
            ? prev
            : nextSize
        ))
      }

      updateMenuSize()

      const resizeObserver = typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateMenuSize)
        : null

      resizeObserver?.observe(node)
      window.addEventListener('resize', updateMenuSize)

      return () => {
        resizeObserver?.disconnect()
        window.removeEventListener('resize', updateMenuSize)
      }
    }, [isOpen, fields.length])

    if (!isOpen || !fields.length) return null

    const hasSettings = fields.some((field) => field.value !== null && field.value !== undefined && field.value !== '')
    const left = clamp(
      position.x - menuSize.width / 2,
      MENU_VIEWPORT_MARGIN,
      window.innerWidth - menuSize.width - MENU_VIEWPORT_MARGIN
    )
    const top = clamp(
      position.y - menuSize.height - MENU_SELECTION_GAP,
      MENU_VIEWPORT_MARGIN,
      window.innerHeight - menuSize.height - MENU_VIEWPORT_MARGIN
    )

    return (
      <div
        ref={setMenuRef}
        className="fixed z-[9999] tts-bubble-menu"
        style={{
          left,
          top,
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex max-w-[360px] flex-wrap items-center gap-1 rounded-lg border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95">
          {fields.map((field) => (
            <DropdownMenu key={field.key}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'flex items-center gap-1 rounded px-2 py-1 text-sm transition-colors hover:bg-accent',
                    field.value !== null && field.value !== undefined && field.value !== '' && 'text-primary'
                  )}
                >
                  {getFieldIcon(field.role)}
                  <span className="max-w-[90px] truncate">{getFieldValueLabel(field)}</span>
                  <svg className="h-3 w-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[160px]">
                <DropdownMenuItem onClick={() => onFieldChange(field.key, null)}>
                  Default
                </DropdownMenuItem>
                {field.options.map((option) => {
                  const displayLabel = field.role === 'emotion' && typeof option.value === 'string' && EMOTION_LABEL_MAP[option.value]
                    ? EMOTION_LABEL_MAP[option.value]
                    : option.label

                  return (
                    <DropdownMenuItem
                      key={option.id}
                      onClick={() => onFieldChange(field.key, option.value as number | string)}
                      className={cn(field.value === option.value && 'bg-accent')}
                    >
                      <span>{displayLabel}</span>
                      {option.description && (
                        <span className="ml-auto text-xs text-muted-foreground">{option.description}</span>
                      )}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}

          {hasSettings && (
            <>
              <div className="h-4 w-px bg-muted" />
              <button
                onClick={onClear}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Clear TTS marks"
              >
                <TbX className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    )
  }
)

TTSBubbleMenu.displayName = 'TTSBubbleMenu'
