/**
 * TTS Mention Menu Component
 * 级联菜单样式，支持键盘导航和自动展开子菜单
 */

import { useTranslation } from 'react-i18next'
import { IoIosFemale, IoIosMale } from 'react-icons/io'
import { TbVolume, TbBrandEdge, TbBrandOpenai, TbSearch } from 'react-icons/tb'
import { MdOutlineLocalFireDepartment } from 'react-icons/md'
import { TTSMenuItem, MenuPath } from '../../lib/tts-mention/types'
import { getMenuItems, getBreadcrumb } from '../../lib/tts-mention/data'
import { cn } from '../../lib/utils'
import { ForwardedRef, forwardRef, useRef, useState, useEffect } from 'react'

interface TTSMenuProps {
  isOpen: boolean
  items: TTSMenuItem[]
  query: string
  path: MenuPath
  selectedIndex: number
  position: { x: number; y: number }
  onQueryChange: (query: string) => void
  onSelect: (item: TTSMenuItem) => void
  onGoBack: () => boolean
  onClose: () => void
}

// 图标映射
const iconMap: Record<string, React.ReactNode> = {
  TbBrandEdge: <TbBrandEdge className="w-4 h-4" />,
  TbBrandOpenai: <TbBrandOpenai className="w-4 h-4" />,
  TbVolcano: <MdOutlineLocalFireDepartment className="w-4 h-4 text-orange-500" />,
}

// 判断是否有下一级
const hasChildren = (item: TTSMenuItem) => {
  return (
    item.type === 'provider' ||
    item.type === 'language' ||
    item.type === 'scene' ||
    item.type === 'model'
  )
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
      onQueryChange,
      onSelect,
      onGoBack,
      onClose: _onClose,
    },
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const { t } = useTranslation()
    const inputRef = useRef<HTMLInputElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const mainItemRefs = useRef<Map<number, HTMLDivElement>>(new Map())
    const subItemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

    // 主菜单状态
    const [mainIndex, setMainIndex] = useState(0)
    const [subIndex, setSubIndex] = useState(0)
    const [isInSubMenu, setIsInSubMenu] = useState(false)
    const [subMenuItems, setSubMenuItems] = useState<TTSMenuItem[]>([])
    const [hoveredMainIndex, setHoveredMainIndex] = useState<number | null>(null)
    const [hoveredSubIndex, setHoveredSubIndex] = useState<number | null>(null)

    // 主菜单自动滚动
    useEffect(() => {
      const item = mainItemRefs.current.get(mainIndex)
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }, [mainIndex])

    // 子菜单自动滚动
    useEffect(() => {
      const item = subItemRefs.current.get(subIndex)
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }, [subIndex])

    // 当 path 改变时，重置状态
    useEffect(() => {
      setMainIndex(0)
      setSubIndex(0)
      setIsInSubMenu(false)
      setSubMenuItems([])
      setHoveredMainIndex(null)
      setHoveredSubIndex(null)
    }, [path])

    // 当 items 改变时，重置主菜单索引
    useEffect(() => {
      setMainIndex(0)
      setIsInSubMenu(false)
      setSubMenuItems([])
    }, [parentItems])

    // 获取当前主菜单项的子菜单
    const currentMainItem = parentItems[mainIndex]
    useEffect(() => {
      if (currentMainItem && hasChildren(currentMainItem)) {
        // 计算子菜单路径
        let childPath: MenuPath = { ...path }
        if (currentMainItem.type === 'provider') {
          childPath = { provider: currentMainItem.data?.provider as any }
        } else if (currentMainItem.type === 'language') {
          childPath = { ...path, language: currentMainItem.data?.code }
        } else if (currentMainItem.type === 'scene') {
          childPath = { ...path, scene: currentMainItem.data?.scene }
        } else if (currentMainItem.type === 'model') {
          childPath = { ...path, model: currentMainItem.data?.model }
        }
        const children = getMenuItems(childPath, '', path.provider)
        setSubMenuItems(children)
      } else {
        setSubMenuItems([])
      }
    }, [mainIndex, currentMainItem, path])

    // 键盘导航
    useEffect(() => {
      if (!isOpen) return

      const handleKeyDown = (e: KeyboardEvent) => {
        if (isInSubMenu) {
          // 在子菜单中
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSubIndex((prev) => (prev - 1 + subMenuItems.length) % subMenuItems.length)
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSubIndex((prev) => (prev + 1) % subMenuItems.length)
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            setIsInSubMenu(false)
            setSubIndex(0)
          } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            // 如果子菜单当前项还有子项，进入下一级
            const currentSubItem = subMenuItems[subIndex]
            if (currentSubItem && hasChildren(currentSubItem)) {
              onSelect(currentSubItem)
            }
          } else if (e.key === 'Backspace') {
            // 不阻止默认行为，让编辑器处理删除
            // 同时返回主菜单
            setIsInSubMenu(false)
            setSubIndex(0)
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const currentSubItem = subMenuItems[subIndex]
            if (currentSubItem) {
              if (hasChildren(currentSubItem)) {
                onSelect(currentSubItem)
              } else {
                onSelect(currentSubItem)
              }
            }
          }
        } else {
          // 在主菜单中
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setMainIndex((prev) => (prev - 1 + parentItems.length) % parentItems.length)
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setMainIndex((prev) => (prev + 1) % parentItems.length)
          } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            if (subMenuItems.length > 0) {
              setIsInSubMenu(true)
              setSubIndex(0)
            }
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            onGoBack()
          } else if (e.key === 'Backspace') {
            // 不阻止默认行为，让编辑器处理删除
            // 菜单会通过 editor update 自动关闭
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const item = parentItems[mainIndex]
            if (item) {
              if (hasChildren(item)) {
                setIsInSubMenu(true)
                setSubIndex(0)
              } else {
                onSelect(item)
              }
            }
          }
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, isInSubMenu, mainIndex, subIndex, parentItems, subMenuItems, onSelect, onGoBack])

    // 同步外部 selectedIndex 到内部 mainIndex
    useEffect(() => {
      if (!isInSubMenu && selectedIndex >= 0 && selectedIndex < parentItems.length) {
        setMainIndex(selectedIndex)
      }
    }, [selectedIndex, isInSubMenu, parentItems.length])

    if (!isOpen) return null

    const breadcrumbs = getBreadcrumb(path)
    const activeMainIndex = hoveredMainIndex ?? mainIndex
    const activeSubIndex = hoveredSubIndex ?? subIndex

    // 计算菜单位置
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
          {/* 主菜单 */}
          <div
            ref={menuRef}
            className="min-w-[220px] overflow-hidden rounded-md border bg-popover p-0 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
          >
            {/* 面包屑导航 / 标题栏 */}
            {breadcrumbs.length > 0 ? (
              <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30">
                <button
                  className="hover:bg-accent rounded p-0.5 transition-colors"
                  onClick={onGoBack}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <div className="flex items-center text-xs text-muted-foreground flex-1 overflow-hidden">
                  {breadcrumbs.map((crumb, index) => (
                    <span key={index} className="flex items-center">
                      {index > 0 && (
                        <svg className="w-3 h-3 mx-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      )}
                      <span
                        className={cn(
                          'truncate max-w-[80px]',
                          index === breadcrumbs.length - 1
                            ? 'text-foreground font-medium'
                            : ''
                        )}
                      >
                        {crumb}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-2 py-1.5 text-xs font-semibold border-b bg-muted/30">
                {t('tts.select_voice') || '选择语音'}
              </div>
            )}

            {/* 搜索框 */}
            <div className="flex items-center px-2 py-1.5 border-b">
              <TbSearch className="w-4 h-4 mr-2 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={t('tts.search') || '搜索...'}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                tabIndex={-1}
              />
            </div>

            {/* 菜单列表 */}
            <div
              className="max-h-[280px] overflow-y-auto p-1"
              onMouseLeave={() => {
                setHoveredMainIndex(null)
                setHoveredSubIndex(null)
              }}
            >
              {parentItems.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {t('tts.no_voice_found') || '未找到'}
                </div>
              ) : (
                parentItems.map((item, index) => (
                  <div
                    key={item.id}
                    ref={(el) => {
                      if (el) mainItemRefs.current.set(index, el)
                    }}
                    className={cn(
                      'relative flex cursor-default select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                      index === activeMainIndex && 'bg-accent text-accent-foreground',
                      index === activeMainIndex && isInSubMenu && 'bg-accent/70'
                    )}
                    onClick={() => {
                      if (hasChildren(item)) {
                        setIsInSubMenu(true)
                        setSubIndex(0)
                      } else {
                        onSelect(item)
                      }
                    }}
                    onMouseEnter={() => {
                      setHoveredMainIndex(index)
                      setMainIndex(index)
                      setIsInSubMenu(false)
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {item.icon && (
                        <span className="flex-shrink-0">{iconMap[item.icon]}</span>
                      )}
                      <span className="truncate">{item.label}</span>
                      {(item.gender === 'Female' || item.gender === 'female') && (
                        <IoIosFemale className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                      )}
                      {(item.gender === 'Male' || item.gender === 'male') && (
                        <IoIosMale className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.type === 'voice' && (
                        <TbVolume
                          className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            console.log('试听:', item)
                          }}
                        />
                      )}
                      {hasChildren(item) && (
                        <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 底部提示 */}
            <div className="-mx-1 my-1 h-px bg-muted" />
            <div className="px-2 py-1 text-[10px] text-muted-foreground flex items-center justify-between">
              <span>↑↓ 选择 → 进入</span>
              <span>← 返回 · Esc 关闭</span>
            </div>
          </div>

          {/* 子菜单 */}
          {subMenuItems.length > 0 && (
            <div className="min-w-[220px] overflow-hidden rounded-md border bg-popover p-0 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
              {/* 子菜单标题 */}
              <div className="px-2 py-1.5 text-xs font-semibold border-b bg-muted/30">
                {currentMainItem?.label || '选择'}
              </div>

              {/* 子菜单列表 */}
              <div
                className="max-h-[280px] overflow-y-auto p-1"
                onMouseLeave={() => setHoveredSubIndex(null)}
              >
                {subMenuItems.map((item, index) => (
                  <div
                    key={item.id}
                    ref={(el) => {
                      if (el) subItemRefs.current.set(index, el)
                    }}
                    className={cn(
                      'relative flex cursor-default select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                      index === activeSubIndex && isInSubMenu && 'bg-accent text-accent-foreground',
                      index === activeSubIndex && !isInSubMenu && 'bg-accent/50'
                    )}
                    onClick={() => onSelect(item)}
                    onMouseEnter={() => {
                      setHoveredSubIndex(index)
                      setSubIndex(index)
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {item.icon && (
                        <span className="flex-shrink-0">{iconMap[item.icon]}</span>
                      )}
                      <span className="truncate">{item.label}</span>
                      {(item.gender === 'Female' || item.gender === 'female') && (
                        <IoIosFemale className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                      )}
                      {(item.gender === 'Male' || item.gender === 'male') && (
                        <IoIosMale className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.type === 'voice' && (
                        <TbVolume
                          className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            console.log('试听:', item)
                          }}
                        />
                      )}
                      {hasChildren(item) && (
                        <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
