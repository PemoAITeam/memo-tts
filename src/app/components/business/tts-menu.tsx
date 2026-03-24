import { ForwardedRef, forwardRef, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { IoIosFemale, IoIosMale } from 'react-icons/io'
import { MdOutlineLocalFireDepartment, MdHistory } from 'react-icons/md'
import { TbBrandEdge, TbBrandOpenai, TbMicrophone, TbSearch, TbVolume } from 'react-icons/tb'

import { buildSelectedVoiceConfig, getBreadcrumb, getLoadingMenuItems, getMenuItems } from '../../lib/tts-mention/data'
import { getTTSHostErrorMessage } from '../../lib/tts-plugin'
import { MenuPath, TTSMenuItem } from '../../lib/tts-mention/types'
import { RecentVoiceEntry } from '../../lib/tts-mention/recent-voices-store'
import { cn } from '../../lib/utils'
import { toast } from '../ui/use-toast'

interface TTSMenuProps {
  isOpen: boolean
  items: TTSMenuItem[]
  query: string
  path: MenuPath
  selectedIndex: number
  position: { x: number; y: number }
  recentVoices?: RecentVoiceEntry[]
  onQueryChange: (query: string) => void
  onSelect: (item: TTSMenuItem) => void
  onGoBack: () => boolean
  onClose: () => void
  onSelectRecentVoice?: (entry: RecentVoiceEntry) => void
}

const iconMap: Record<string, ReactNode> = {
  TbBrandEdge: <TbBrandEdge className="h-4 w-4" />,
  TbBrandOpenai: <TbBrandOpenai className="h-4 w-4" />,
  TbVolcano: <MdOutlineLocalFireDepartment className="h-4 w-4 text-orange-500" />,
  TbMicrophone: <TbMicrophone className="h-4 w-4" />,
}

const PROVIDER_ICON_MAP: Array<{ match: RegExp; icon: string }> = [
  { match: /edge/i, icon: 'TbBrandEdge' },
  { match: /openai/i, icon: 'TbBrandOpenai' },
  { match: /volc|volcano/i, icon: 'TbVolcano' },
]

function resolveProviderIcon(provider: string, pluginId?: string): string {
  const source = `${provider} ${pluginId || ''}`
  return PROVIDER_ICON_MAP.find((item) => item.match.test(source))?.icon || 'TbMicrophone'
}

const hasChildren = (item: TTSMenuItem) => {
  if (item.disabled) {
    return false
  }

  return (
    item.type === 'provider'
    || item.type === 'language'
    || item.type === 'scene'
    || item.type === 'model'
  )
}

const getItemPathValue = (item: TTSMenuItem) => {
  return item.data?.value ?? item.data?.code ?? item.data?.scene ?? item.data?.model
}

export const TTSMenu = forwardRef<HTMLDivElement, TTSMenuProps>(
  (
    {
      isOpen,
      items: parentItems,
      query,
      path,
      selectedIndex,
      position,
      recentVoices = [],
      onQueryChange,
      onSelect,
      onGoBack,
      onSelectRecentVoice,
    },
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const { t } = useTranslation()
    const inputRef = useRef<HTMLInputElement>(null)
    const mainItemRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const subItemRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const previewAudioRef = useRef<HTMLAudioElement | null>(null)
    const previewUrlRef = useRef<string | undefined>(undefined)
    const synthesize = window.AIM?.tts?.synthesize

    const [mainIndex, setMainIndex] = useState(0)
    const [subIndex, setSubIndex] = useState(0)
    const [isInSubMenu, setIsInSubMenu] = useState(false)
    const [subMenuItems, setSubMenuItems] = useState<TTSMenuItem[]>([])
    const [hoveredMainIndex, setHoveredMainIndex] = useState<number | null>(null)
    const [hoveredSubIndex, setHoveredSubIndex] = useState<number | null>(null)
    const [isInRecentSection, setIsInRecentSection] = useState(false)
    const [recentIndex, setRecentIndex] = useState(0)

    const recentItemRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const isRootLevel = !path.language && !path.scene && !path.model
    const showRecentSection = recentVoices.length > 0 && isRootLevel

    const cleanupPreview = () => {
      previewAudioRef.current?.pause()
      previewAudioRef.current = null

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = undefined
      }
    }

    const getChildPath = (item?: TTSMenuItem): MenuPath | undefined => {
      if (!item || !hasChildren(item)) {
        return undefined
      }

      if (item.type === 'provider') {
        return { provider: item.data?.provider as string }
      }

      if (item.type === 'language') {
        return { ...path, language: String(getItemPathValue(item) ?? '') }
      }

      if (item.type === 'scene') {
        return { ...path, scene: String(getItemPathValue(item) ?? '') as any }
      }

      if (item.type === 'model') {
        return { ...path, model: String(getItemPathValue(item) ?? '') }
      }

      return undefined
    }

    const extendItemWithPath = (item: TTSMenuItem, itemPath?: MenuPath) => {
      if (!itemPath) {
        return item
      }

      return {
        ...item,
        data: {
          ...item.data,
          menuPath: itemPath,
        },
      }
    }

    const auditionItem = async (item: TTSMenuItem, itemPath: MenuPath) => {
      if (item.type !== 'voice' || item.disabled) {
        return
      }

      if (!synthesize) {
        toast({
          variant: 'destructive',
          description: t('tts.preview not supported', {
            defaultValue: 'The Electron host has not exposed plugin voice preview yet.',
          }),
        })
        return
      }

      const selection = buildSelectedVoiceConfig(itemPath, item)
      if (!selection?.provider || !selection.pluginId) {
        return
      }

      try {
        const result = await synthesize({
          provider: selection.provider,
          pluginId: selection.pluginId,
          text: 'Welcome to memo',
          options: selection.config,
          returnBuffer: true,
        })

        if (!result?.success || !result.data) {
          toast({
            variant: 'destructive',
            description: getTTSHostErrorMessage(
              result?.message,
              t('tts.preview failed', {
                defaultValue: 'Voice preview failed. Please check the plugin configuration in the host.',
              })
            ),
          })
          return
        }

        const bufferLike = result.data?.data ?? result.data
        cleanupPreview()

        const nextUrl = URL.createObjectURL(new Blob([bufferLike], { type: 'audio/mpeg' }))
        const audio = new Audio(nextUrl)

        previewUrlRef.current = nextUrl
        previewAudioRef.current = audio
        await audio.play()
      } catch (error) {
        toast({
          variant: 'destructive',
          description: getTTSHostErrorMessage(
            error,
            t('tts.preview failed', {
              defaultValue: 'Voice preview failed. Please check the plugin configuration in the host.',
            })
          ),
        })
        console.warn('[TTSMenu] audition failed', error)
      }
    }

    useEffect(() => {
      return () => {
        cleanupPreview()
      }
    }, [])

    useEffect(() => {
      const item = mainItemRefs.current.get(mainIndex)
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }, [mainIndex])

    useEffect(() => {
      const item = subItemRefs.current.get(subIndex)
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }, [subIndex])

    useEffect(() => {
      const item = recentItemRefs.current.get(recentIndex)
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }, [recentIndex])

    useEffect(() => {
      setMainIndex(0)
      setSubIndex(0)
      setIsInSubMenu(false)
      setSubMenuItems([])
      setHoveredMainIndex(null)
      setHoveredSubIndex(null)
      setIsInRecentSection(false)
      setRecentIndex(0)
    }, [path])

    useEffect(() => {
      setMainIndex(0)
      setIsInSubMenu(false)
      setSubMenuItems([])
      setIsInRecentSection(false)
      setRecentIndex(0)
    }, [parentItems])

    const currentMainItem = parentItems[mainIndex]
    const currentSubMenuPath = getChildPath(currentMainItem)

    useEffect(() => {
      const nextSubMenuPath = getChildPath(currentMainItem)
      let cancelled = false

      if (!nextSubMenuPath) {
        setSubMenuItems([])
        return
      }

      setSubMenuItems(getLoadingMenuItems())
      void getMenuItems(nextSubMenuPath, '', nextSubMenuPath.provider || path.provider)
        .then((items) => {
          if (!cancelled) {
            setSubMenuItems(items)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSubMenuItems([])
          }
        })
      return () => {
        cancelled = true
      }
    }, [currentMainItem, path.language, path.model, path.provider, path.scene])

    useEffect(() => {
      if (!isOpen) {
        return
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        const nextSubMenuPath = getChildPath(currentMainItem)
        const hasRecentVoices = showRecentSection

        if (isInRecentSection && hasRecentVoices) {
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setRecentIndex((prev) => (prev - 1 + recentVoices.length) % recentVoices.length)
            return
          }

          if (e.key === 'ArrowDown') {
            e.preventDefault()
            const nextIndex = recentIndex + 1
            if (nextIndex >= recentVoices.length) {
              setIsInRecentSection(false)
              setMainIndex(0)
            } else {
              setRecentIndex(nextIndex)
            }
            return
          }

          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            onGoBack()
            return
          }

          if (e.key === 'Enter') {
            e.preventDefault()
            const recentEntry = recentVoices[recentIndex]
            if (recentEntry && onSelectRecentVoice) {
              onSelectRecentVoice(recentEntry)
            }
            return
          }

          return
        }

        if (isInSubMenu) {
          if (e.key === 'ArrowUp') {
            if (subMenuItems.length === 0) {
              return
            }
            e.preventDefault()
            setSubIndex((prev) => (prev - 1 + subMenuItems.length) % subMenuItems.length)
            return
          }

          if (e.key === 'ArrowDown') {
            if (subMenuItems.length === 0) {
              return
            }
            e.preventDefault()
            setSubIndex((prev) => (prev + 1) % subMenuItems.length)
            return
          }

          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            setIsInSubMenu(false)
            setSubIndex(0)
            return
          }

          if (e.key === 'ArrowRight') {
            e.preventDefault()
            const currentSubItem = subMenuItems[subIndex]
            if (currentSubItem && hasChildren(currentSubItem)) {
              onSelect(extendItemWithPath(currentSubItem, nextSubMenuPath))
            }
            return
          }

          if (e.key === 'Backspace') {
            setIsInSubMenu(false)
            setSubIndex(0)
            return
          }

          if (e.key === 'Enter') {
            e.preventDefault()
            const currentSubItem = subMenuItems[subIndex]
            if (currentSubItem) {
              onSelect(extendItemWithPath(currentSubItem, nextSubMenuPath))
            }
          }
          return
        }

        if (e.key === 'ArrowUp') {
          if (parentItems.length === 0 && !hasRecentVoices) {
            return
          }
          e.preventDefault()
          const prevIndex = mainIndex - 1
          if (prevIndex < 0 && hasRecentVoices) {
            setIsInRecentSection(true)
            setRecentIndex(recentVoices.length - 1)
          } else {
            setMainIndex((prev) => (prev - 1 + parentItems.length) % parentItems.length)
          }
          return
        }

        if (e.key === 'ArrowDown') {
          if (parentItems.length === 0 && !hasRecentVoices) {
            return
          }
          e.preventDefault()
          if (parentItems.length === 0 && hasRecentVoices) {
            setIsInRecentSection(true)
            setRecentIndex(0)
          } else {
            const nextIndex = mainIndex + 1
            if (nextIndex >= parentItems.length && hasRecentVoices) {
              // Already at bottom, do nothing or cycle
              setMainIndex(0)
              if (hasRecentVoices) {
                setIsInRecentSection(true)
                setRecentIndex(0)
              }
            } else {
              setMainIndex((prev) => (prev + 1) % parentItems.length)
            }
          }
          return
        }

        if (e.key === 'ArrowRight') {
          e.preventDefault()
          if (subMenuItems.length > 0) {
            setIsInSubMenu(true)
            setSubIndex(0)
          }
          return
        }

        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          onGoBack()
          return
        }

        if (e.key === 'Enter') {
          e.preventDefault()
          const item = parentItems[mainIndex]
          if (!item) {
            return
          }

          if (hasChildren(item)) {
            setIsInSubMenu(true)
            setSubIndex(0)
            return
          }

          onSelect(item)
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [currentMainItem, isInRecentSection, isInSubMenu, isOpen, mainIndex, onGoBack, onSelect, onSelectRecentVoice, parentItems, recentIndex, recentVoices, showRecentSection, subIndex, subMenuItems])

    useEffect(() => {
      if (!isInSubMenu && selectedIndex >= 0 && selectedIndex < parentItems.length) {
        setMainIndex(selectedIndex)
      }
    }, [isInSubMenu, parentItems.length, selectedIndex])

    if (!isOpen) {
      return null
    }

    const breadcrumbs = getBreadcrumb(path)
    const activeMainIndex = hoveredMainIndex ?? mainIndex
    const activeSubIndex = hoveredSubIndex ?? subIndex

    const menuWidth = 220
    const subMenuWidth = 220
    const totalWidth = subMenuItems.length > 0 ? menuWidth + subMenuWidth + 4 : menuWidth

    return (
      <div
        ref={ref}
        className="fixed z-[9999]"
        style={{
          left: Math.min(position.x, window.innerWidth - totalWidth - 20),
          top: Math.min(position.y, window.innerHeight - 400),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-1">
          <div className="min-w-[220px] overflow-hidden rounded-md border bg-popover p-0 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
            {breadcrumbs.length > 0 ? (
              <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-1.5">
                <button className="rounded p-0.5 transition-colors hover:bg-accent" onClick={onGoBack}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <div className="flex flex-1 items-center overflow-hidden text-xs text-muted-foreground">
                  {breadcrumbs.map((crumb, index) => (
                    <span key={index} className="flex items-center">
                      {index > 0 && (
                        <svg className="mx-0.5 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      )}
                      <span
                        className={cn(
                          'truncate max-w-[80px]',
                          index === breadcrumbs.length - 1 ? 'font-medium text-foreground' : ''
                        )}
                      >
                        {crumb}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-b bg-muted/30 px-2 py-1.5 text-xs font-semibold">
                {t('tts.select_voice') || 'Select voice'}
              </div>
            )}

            <div className="flex items-center border-b px-2 py-1.5">
              <TbSearch className="mr-2 h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={t('tts.search') || 'Search...'}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                tabIndex={-1}
              />
            </div>

            {/* Recent Voices Section */}
            {showRecentSection && (
              <div className="border-b">
                <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-muted-foreground">
                  <MdHistory className="h-3.5 w-3.5" />
                  {t('tts.recent_voices') || 'Recent'}
                </div>
                <div
                  className="max-h-[120px] overflow-y-auto p-1"
                  onMouseLeave={() => setIsInRecentSection(false)}
                >
                  {recentVoices.map((entry, index) => (
                    <div
                      key={`recent-${entry.pluginId}-${index}`}
                      ref={(el) => {
                        if (el) {
                          recentItemRefs.current.set(index, el)
                        }
                      }}
                      className={cn(
                        'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                        isInRecentSection && index === recentIndex && 'bg-accent text-accent-foreground'
                      )}
                      onClick={() => {
                        if (onSelectRecentVoice) {
                          onSelectRecentVoice(entry)
                        }
                      }}
                      onMouseEnter={() => {
                        setIsInRecentSection(true)
                        setRecentIndex(index)
                        setHoveredMainIndex(null)
                      }}
                    >
                      <span className="flex-shrink-0">{iconMap[resolveProviderIcon(entry.config.provider, entry.config.pluginId)]}</span>
                      <span className="truncate">{entry.config.displayLabel || entry.config.voiceLocalName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="max-h-[280px] overflow-y-auto p-1"
              onMouseLeave={() => {
                setHoveredMainIndex(null)
                setHoveredSubIndex(null)
              }}
            >
              {parentItems.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {t('tts.no_voice_found') || 'No voice found'}
                </div>
              ) : (
                parentItems.map((item, index) => (
                  <div
                    key={item.id}
                    ref={(el) => {
                      if (el) {
                        mainItemRefs.current.set(index, el)
                      }
                    }}
                    className={cn(
                      'relative flex cursor-default select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                      item.disabled && 'cursor-not-allowed opacity-50',
                      index === activeMainIndex && 'bg-accent text-accent-foreground',
                      index === activeMainIndex && isInSubMenu && 'bg-accent/70'
                    )}
                    onClick={() => {
                      if (item.disabled) {
                        return
                      }

                      if (hasChildren(item)) {
                        setIsInSubMenu(true)
                        setSubIndex(0)
                        return
                      }

                      onSelect(item)
                    }}
                    onMouseEnter={() => {
                      setHoveredMainIndex(index)
                      setMainIndex(index)
                      setIsInSubMenu(false)
                    }}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {item.icon && (
                        <span className="flex-shrink-0">{iconMap[item.icon]}</span>
                      )}
                      <span className="truncate">{item.label}</span>
                      {(item.gender === 'Female' || item.gender === 'female') && (
                        <IoIosFemale className="h-3.5 w-3.5 flex-shrink-0 text-pink-500" />
                      )}
                      {(item.gender === 'Male' || item.gender === 'male') && (
                        <IoIosMale className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      {item.type === 'voice' && (
                        <TbVolume
                          className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground"
                          onClick={async (e) => {
                            e.stopPropagation()
                            await auditionItem(item, path)
                          }}
                        />
                      )}
                      {hasChildren(item) && (
                        <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="-mx-1 my-1 h-px bg-muted" />
            <div className="flex items-center justify-between px-2 py-1 text-[10px] text-muted-foreground">
              <span>↑↓ select → enter</span>
              <span>← back · Esc close</span>
            </div>
          </div>

          {subMenuItems.length > 0 && (
            <div className="min-w-[220px] overflow-hidden rounded-md border bg-popover p-0 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
              <div className="border-b bg-muted/30 px-2 py-1.5 text-xs font-semibold">
                {currentMainItem?.label || 'Select'}
              </div>

              <div className="max-h-[280px] overflow-y-auto p-1" onMouseLeave={() => setHoveredSubIndex(null)}>
                {subMenuItems.map((item, index) => (
                  <div
                    key={item.id}
                    ref={(el) => {
                      if (el) {
                        subItemRefs.current.set(index, el)
                      }
                    }}
                    className={cn(
                      'relative flex cursor-default select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                      item.disabled && 'cursor-not-allowed opacity-50',
                      index === activeSubIndex && isInSubMenu && 'bg-accent text-accent-foreground',
                      index === activeSubIndex && !isInSubMenu && 'bg-accent/50'
                    )}
                    onClick={() => {
                      if (!item.disabled) {
                        onSelect(extendItemWithPath(item, currentSubMenuPath))
                      }
                    }}
                    onMouseEnter={() => {
                      setHoveredSubIndex(index)
                      setSubIndex(index)
                    }}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {item.icon && (
                        <span className="flex-shrink-0">{iconMap[item.icon]}</span>
                      )}
                      <span className="truncate">{item.label}</span>
                      {(item.gender === 'Female' || item.gender === 'female') && (
                        <IoIosFemale className="h-3.5 w-3.5 flex-shrink-0 text-pink-500" />
                      )}
                      {(item.gender === 'Male' || item.gender === 'male') && (
                        <IoIosMale className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      {item.type === 'voice' && (
                        <TbVolume
                          className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground"
                          onClick={async (e) => {
                            e.stopPropagation()
                            await auditionItem(item, currentSubMenuPath || path)
                          }}
                        />
                      )}
                      {hasChildren(item) && (
                        <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

TTSMenu.displayName = 'TTSMenu'
