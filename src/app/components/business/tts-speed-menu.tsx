/**
 * TTS Speed Menu Component
 * / 菜单用于选择语速和情绪
 * 第一级：速度入口 + 情绪入口
 * 第二级（速度入口）：具体速度值
 * 第二级（情绪入口）：具体情绪值
 */

import { forwardRef, ForwardedRef, useEffect, useRef } from 'react'
import { TbGaugeFilled, TbChevronLeft, TbMoodSmile } from 'react-icons/tb'
import { SpeedMenuItem } from '@/app/lib/tts-mention/tts-speed'
import { cn } from '@/app/lib/utils'

interface TTSSpeedMenuProps {
  isOpen: boolean
  items: SpeedMenuItem[]
  query: string
  level: 'main' | 'speed' | 'emotion'  // 主菜单、速度子菜单 或 情绪子菜单
  selectedIndex: number
  position: { x: number; y: number }
  onQueryChange: (query: string) => void
  onSelect: (item: SpeedMenuItem) => void
  onGoBack: () => void
  onClose: () => void
}

export const TTSSpeedMenu = forwardRef<HTMLDivElement, TTSSpeedMenuProps>(
  (
    {
      isOpen,
      items,
      query,
      level,
      selectedIndex,
      position,
      onQueryChange,
      onSelect,
      onGoBack,
      onClose: _onClose,
    },
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

    // 自动滚动到选中项
    useEffect(() => {
      const item = itemRefs.current.get(selectedIndex)
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }, [selectedIndex])

    if (!isOpen) return null

    const menuWidth = 200
    const totalWidth = level === 'main' && items.length > 0 ? menuWidth + 180 : menuWidth

    // 判断是否有子菜单（速度入口或情绪入口被选中时）
    const selectedItem = items[selectedIndex]
    const showSubMenu = level === 'main' && selectedIndex >= 0 &&
      (selectedItem?.type === 'speedEntry' || selectedItem?.type === 'emotionEntry')

    // 获取标题和图标
    const getTitle = () => {
      if (level === 'speed') return '选择语速'
      if (level === 'emotion') return '选择情绪'
      return '选择选项'
    }

    const getIcon = () => {
      if (level === 'emotion') return <TbMoodSmile className="w-4 h-4" />
      return <TbGaugeFilled className="w-4 h-4" />
    }

    // 获取子菜单预览标题
    const getSubMenuTitle = () => {
      if (selectedItem?.type === 'speedEntry') return '语速选项'
      if (selectedItem?.type === 'emotionEntry') return '情绪选项'
      return ''
    }

    return (
      <div
        ref={ref}
        className="fixed z-[9999]"
        style={{
          left: Math.min(position.x, window.innerWidth - totalWidth - 20),
          top: Math.min(position.y, window.innerHeight - 350),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-1">
          {/* 主菜单 */}
          <div className="min-w-[200px] overflow-hidden rounded-md border bg-popover p-0 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
            {/* 标题 */}
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
              {(level === 'speed' || level === 'emotion') && (
                <button
                  className="hover:bg-accent rounded p-0.5 transition-colors mr-1"
                  onClick={onGoBack}
                >
                  <TbChevronLeft className="w-4 h-4" />
                </button>
              )}
              {getIcon()}
              <span className="text-xs font-semibold">{getTitle()}</span>
            </div>

            {/* 搜索框 */}
            <div className="flex items-center px-3 py-2 border-b">
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder={level === 'main' ? '搜索选项...' : '搜索...'}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                tabIndex={-1}
              />
            </div>

            {/* 选项列表 */}
            <div className="max-h-[250px] overflow-y-auto p-1">
              {items.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  未找到匹配项
                </div>
              ) : (
                items.map((item, index) => (
                  <div
                    key={item.id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(index, el)
                    }}
                    className={cn(
                      'flex cursor-default select-none items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm outline-none transition-colors',
                      index === selectedIndex && 'bg-accent text-accent-foreground'
                    )}
                    onClick={() => onSelect(item)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {/* 速度入口或情绪入口显示箭头 */}
                    {(item.type === 'speedEntry' || item.type === 'emotionEntry') && (
                      <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* 底部提示 */}
            <div className="-mx-1 my-1 h-px bg-muted" />
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between">
              {level === 'main' ? (
                <>
                  <span>↑↓ 选择 · Enter 确认</span>
                  <span>Esc 关闭</span>
                </>
              ) : (
                <>
                  <span>↑↓ 选择 · Enter 确认</span>
                  <span>← 返回 · Esc 关闭</span>
                </>
              )}
            </div>
          </div>

          {/* 子菜单预览（当速度入口或情绪入口被选中时显示） */}
          {showSubMenu && (
            <div className="min-w-[180px] overflow-hidden rounded-md border bg-popover p-0 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 opacity-60">
              {/* 子菜单标题 */}
              <div className="px-3 py-2 border-b bg-muted/30">
                <span className="text-xs font-semibold">{getSubMenuTitle()}</span>
              </div>
              {/* 子菜单提示 */}
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                按 → 或 Enter 进入
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
)

TTSSpeedMenu.displayName = 'TTSSpeedMenu'
