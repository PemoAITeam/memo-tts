import './tiptap.scss'
import './tts-mention-styles.scss'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef, useState, type DragEvent as ReactDragEvent } from 'react'
import { inject, observer } from 'mobx-react'
import mammoth from 'mammoth'
import { useTranslation } from 'react-i18next'
import { TbEraser, TbLoader, TbWand, TbAt, TbFileImport, TbLetterT } from 'react-icons/tb'
import { IoStopCircleOutline } from 'react-icons/io5'

import { EditorCard } from '../extensions/editor-card'
import { EventHandler } from '../extensions/paste-plugin'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip'
import SelectTTSProvider from './SelectTTSProvider'
import { TTSMenu } from './tts-menu'
import { TTSBubbleMenu } from './tts-bubble-menu'
import { toast } from '../ui/use-toast'
import { createEditorDocumentFromMarkdown, createEditorDocumentFromText } from '@/app/lib/editor-import'
import { cn, generateUUID, normalizeEditorDocument } from '@/app/lib/utils'
import type DataStore from '@/app/stores/dataStore'
import type PluginStore from '@/app/stores/pluginStore'
import {
  TTSMentionSimple,
  TTSMentionNode,
  TTSMark,
  sanitizeUnsupportedSegmentMarks,
  useTTSBubbleMenu,
  useTTSMentionMenu,
  type SelectedVoiceConfig,
} from '@/app/lib/tts-mention'

const DROP_TITLE_BY_LANGUAGE: Record<string, string> = {
  en: 'Release to import the file',
  zh: '松开即可导入文件',
  zh_tw: '鬆開即可匯入檔案',
  ja: 'ドロップしてファイルを読み込む',
  ko: '놓으면 파일을 가져옵니다',
  es: 'Suelta para importar el archivo',
  de: 'Loslassen, um die Datei zu importieren',
  it: 'Rilascia per importare il file',
}

function normalizeUILanguage(language?: string) {
  const normalizedLanguage = String(language || 'en').toLowerCase().replace('-', '_')
  if (normalizedLanguage.startsWith('zh_tw') || normalizedLanguage.startsWith('zh_hk')) {
    return 'zh_tw'
  }
  if (normalizedLanguage.startsWith('zh')) {
    return 'zh'
  }

  return normalizedLanguage.split('_')[0]
}

function stableSerializeConfig(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerializeConfig(item)).join(',')}]`
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, itemValue]) => `${JSON.stringify(key)}:${stableSerializeConfig(itemValue)}`)

    return `{${entries.join(',')}}`
  }

  return JSON.stringify(value)
}

function parseSelectedVoiceConfig(value: unknown): SelectedVoiceConfig | null {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as SelectedVoiceConfig
    } catch (error) {
      console.warn('Failed to parse mention voice config:', error)
      return null
    }
  }

  if (typeof value === 'object') {
    return value as SelectedVoiceConfig
  }

  return null
}

const WORD_FILE_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
])

function getDroppedFileKind(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'md' || extension === 'markdown') {
    return 'markdown'
  }

  if (extension === 'txt' || file.type === 'text/plain') {
    return 'text'
  }

  if (extension === 'doc' || extension === 'docx' || WORD_FILE_TYPES.has(file.type)) {
    return 'word'
  }

  return null
}

function isEditorDocumentEmpty(editor: Editor) {
  const editorDocument = normalizeEditorDocument(editor.getJSON())
  const editorCards: any[] = Array.isArray(editorDocument?.content) ? editorDocument.content : []

  return !editorCards.some((card) => Array.isArray(card?.content) && card.content.length > 0)
}

function isEditorContentEmpty(value: unknown) {
  const editorDocument = normalizeEditorDocument(value)
  const editorCards: any[] = Array.isArray(editorDocument?.content) ? editorDocument.content : []

  return !editorCards.some((card) => Array.isArray(card?.content) && card.content.length > 0)
}

function hasDraggedFiles(event: Pick<ReactDragEvent<HTMLDivElement>, 'dataTransfer'>) {
  return Array.from(event.dataTransfer?.types || []).includes('Files')
}

interface TiptapProps {
  setEditor?: (editor: Editor) => void
  content?: any
  dataStore?: DataStore
  pluginStore?: PluginStore
  ttsProvider?: string
  onProviderChange?: (provider: string) => void
  onSynthesize?: () => void
  onStopSynthesis?: () => void
  synthesisActive?: boolean
  synthesisBusy?: boolean
  synthesisDisabled?: boolean
  synthesisProgress?: number
  showEmptyGuide?: boolean
  persistDraft?: boolean
}

const Tiptap = inject('dataStore', 'pluginStore')(observer(({
  setEditor,
  content,
  dataStore,
  pluginStore,
  ttsProvider,
  onProviderChange,
  onSynthesize,
  onStopSynthesis,
  synthesisActive,
  synthesisBusy,
  synthesisDisabled,
  synthesisProgress,
  showEmptyGuide = true,
  persistDraft = true,
}: TiptapProps) => {
  const { t, i18n } = useTranslation()
  const [isEmpty, setIsEmpty] = useState(true)
  const [isDragActive, setIsDragActive] = useState(false)
  const dragDepthRef = useRef(0)
  const currentLanguage = normalizeUILanguage(i18n.resolvedLanguage || i18n.language)
  const dropTitleDefault = DROP_TITLE_BY_LANGUAGE[currentLanguage] || DROP_TITLE_BY_LANGUAGE.en

  const effectiveProvider = ttsProvider || pluginStore?.provider
  const effectiveProviderConfigKey = effectiveProvider
    ? stableSerializeConfig(pluginStore?.getRuntimeTTSConfiguration(effectiveProvider) || {})
    : ''

  const handleTTSMenuOpenRef = useRef<(props: { range: { from: number; to: number }; query: string }) => void>()
  const handleTTSMenuCloseRef = useRef<() => void>()
  const handleMentionEditRef = useRef<(props: { range: { from: number; to: number }; config?: SelectedVoiceConfig | null }) => void>()

  const editor = useEditor({
    extensions: [
      StarterKit,
      EditorCard,
      EventHandler,
      TTSMentionNode,
      TTSMentionSimple.configure({
        onMenuOpen: (props) => {
          handleTTSMenuOpenRef.current?.(props)
        },
        onMenuClose: () => {
          handleTTSMenuCloseRef.current?.()
        },
      }),
      TTSMark,
    ],
    autofocus: true,
    enablePasteRules: false,
    editorProps: {
      handleClickOn: (_view, _pos, node, nodePos, event, direct) => {
        if (!direct || node.type.name !== 'ttsMention') {
          return false
        }

        const parsedConfig = parseSelectedVoiceConfig(node.attrs.config)
        const nextConfig = parsedConfig || (node.attrs.provider
          ? {
            provider: node.attrs.provider,
            displayLabel: node.attrs.label || '',
          } satisfies SelectedVoiceConfig
          : null)

        if (!nextConfig?.provider) {
          return false
        }

        event.preventDefault()
        event.stopPropagation()
        handleMentionEditRef.current?.({
          range: {
            from: nodePos,
            to: nodePos + node.nodeSize,
          },
          config: {
            ...nextConfig,
            provider: nextConfig.provider || node.attrs.provider,
          },
        })
        return true
      },
    },
    onUpdate: (props) => {
      const jsonData = props.editor.getJSON()
      const hasEditorCard = jsonData.content?.filter((item) => item.type === 'editorCard')

      if (!hasEditorCard?.length) {
        props.editor
          .chain()
          .insertContentAt(props.editor.state.selection.head, { type: 'editorCard', attrs: { id: generateUUID() } })
          .focus()
          .run()
      }

      setIsEmpty(isEditorContentEmpty(jsonData))

      if (persistDraft) {
        dataStore?.setEditorData(props.editor.getJSON())
      }
    },
  })

  const handleVoiceSelect = () => {}

  const ttsMenu = useTTSMentionMenu(editor, {
    initialProvider: effectiveProvider,
    onVoiceSelect: handleVoiceSelect,
  })

  const ttsBubbleMenu = useTTSBubbleMenu(editor, {
    provider: effectiveProvider,
    configKey: effectiveProviderConfigKey,
  })

  useEffect(() => {
    handleTTSMenuOpenRef.current = (props: { range: { from: number; to: number }; query: string }) => {
      ttsMenu.openMenu(props)
    }

    handleTTSMenuCloseRef.current = () => {
      ttsMenu.closeMenu()
    }

    handleMentionEditRef.current = (props) => {
      ttsMenu.openEditMenu(props)
    }
  }, [ttsMenu])

  useEffect(() => {
    if (editor) {
      setIsEmpty(isEditorDocumentEmpty(editor))
    }

    if (setEditor && editor) {
      setEditor(editor)
    }

    return () => {
      editor?.destroy()
    }
  }, [editor, setEditor])

  useEffect(() => {
    if (!editor) {
      return
    }

    const nextContent = normalizeEditorDocument(content) || content

    if (nextContent && typeof nextContent === 'object') {
      const nextContentKey = stableSerializeConfig(nextContent)
      const currentContentKey = stableSerializeConfig(editor.getJSON())

      if (nextContentKey === currentContentKey) {
        return
      }
    }

    Promise.resolve().then(() => {
      editor.commands.setContent(nextContent || '<editor-card></editor-card>')
      setIsEmpty(isEditorContentEmpty(nextContent))
    })
  }, [content, editor])

  useEffect(() => {
    if (!editor) {
      return
    }

    let cancelled = false
    let scheduled = false

    const scheduleCleanup = () => {
      if (scheduled || cancelled) {
        return
      }

      scheduled = true

      Promise.resolve().then(() => {
        scheduled = false

        if (cancelled) {
          return
        }

        sanitizeUnsupportedSegmentMarks(editor, effectiveProvider)
      })
    }

    scheduleCleanup()
    editor.on('update', scheduleCleanup)

    return () => {
      cancelled = true
      editor.off('update', scheduleCleanup)
    }
  }, [editor, effectiveProvider])

  const clear = () => {
    editor?.commands.clearContent()
    editor?.chain().insertContentAt(editor.state.selection.head, { type: 'editorCard' }).focus().run()
  }

  const resetDragState = () => {
    dragDepthRef.current = 0
    setIsDragActive(false)
  }

  const handleDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) {
      return
    }

    event.preventDefault()
    dragDepthRef.current += 1
    setIsDragActive(true)
  }

  const handleDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'

    if (!isDragActive) {
      setIsDragActive(true)
    }
  }

  const handleDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) {
      return
    }

    event.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)

    if (dragDepthRef.current === 0) {
      setIsDragActive(false)
    }
  }

  const insertImportedDocument = (document: unknown) => {
    if (!editor) {
      return
    }

    const nextDocument = normalizeEditorDocument(document)
    if (!nextDocument) {
      return
    }

    if (isEditorDocumentEmpty(editor)) {
      editor.commands.setContent(nextDocument, true)
      editor.commands.focus('end')
      return
    }

    editor
      .chain()
      .insertContentAt(editor.state.selection.head, nextDocument.content || [])
      .focus()
      .run()
  }

  const handleDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    resetDragState()

    const file = event.dataTransfer.files[0]
    if (!file || !editor) {
      return
    }

    const fileKind = getDroppedFileKind(file)

    try {
      if (fileKind === 'text') {
        insertImportedDocument(createEditorDocumentFromText(await file.text()))
        return
      }

      if (fileKind === 'markdown') {
        insertImportedDocument(createEditorDocumentFromMarkdown(await file.text()))
        return
      }

      if (fileKind === 'word') {
        const resultObject = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
        insertImportedDocument(createEditorDocumentFromText(resultObject.value))
        return
      }
    } catch (error) {
      console.error('Failed to import file into editor:', error)
      toast({
        variant: 'destructive',
        description: 'Failed to parse this file. Please check the file format and try again.',
      })
      return
    }

    toast({
      variant: 'destructive',
      description: 'Only txt, doc, docx, and md files are supported.',
    })
  }

  const synthesisButton = synthesisActive
    ? (
      <Button
        aria-label={t('tts.synthesis')}
        variant='outline'
        size='sm'
        className='relative overflow-hidden'
        onClick={onStopSynthesis}
      >
        <IoStopCircleOutline size={16} className='relative z-10' />
        <span className='relative z-10'>{t('tts.synthesis')}</span>
        <span className='relative z-10'>{`${synthesisProgress || 0}%`}</span>
        <div
          style={{ width: `${synthesisProgress || 0}%` }}
          className='pointer-events-none absolute left-0 top-0 h-full bg-primary opacity-20'
        />
      </Button>
    )
    : (
      <Button
        aria-label={t('tts.synthesis')}
        size='sm'
        variant='ghost'
        disabled={synthesisDisabled || !onSynthesize}
        onClick={onSynthesize}
      >
        {synthesisBusy
          ? <TbLoader className='transition-colors ease-linear animate-spin' size={16} />
          : <TbWand size={16} />}
        <span>{t('tts.synthesis')}</span>
      </Button>
    )

  return (
    <TooltipProvider delayDuration={0}>
      <div className='flex items-center flex-shrink-0 justify-between mb-4 pr-3'>
        <div className='flex flex-1 items-center gap-3 pr-3'>
          <span className='text-sm whitespace-nowrap text-muted-foreground'>{t('tts.provider')}</span>
          <div className='w-full max-w-52'>
            <SelectTTSProvider onChange={onProviderChange || (() => undefined)} />
          </div>
        </div>
        <div className='flex items-center flex-shrink-0 gap-1'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button aria-label={t('app.clear')} variant='ghost' size='icon' onClick={clear}>
                <TbEraser size={18} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('app.clear')}</TooltipContent>
          </Tooltip>
        </div>
          {synthesisButton}
      </div>

      <div
        id='drop-area'
        className={cn(
          'flex-1 overflow-y-auto pr-3 relative',
          isDragActive && 'is-dragging',
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <EditorContent editor={editor} />
        {showEmptyGuide && isEmpty && !isDragActive && (
          <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
            <div className='text-center text-muted-foreground space-y-4 p-6 max-w-md'>
              <h3 className='text-lg font-medium'>{t('editor.empty.title', { defaultValue: '开始创作' })}</h3>
              <div className='space-y-3 text-sm'>
                <div className='flex items-center gap-3 p-3 bg-muted/50 rounded-lg'>
                  <TbAt size={20} className='text-primary flex-shrink-0' />
                  <span>{t('editor.empty.mention')}</span>
                </div>
                <div className='flex items-center gap-3 p-3 bg-muted/50 rounded-lg'>
                  <TbLetterT size={20} className='text-primary flex-shrink-0' />
                  <span>{t('editor.empty.selection')}</span>
                </div>
                <div className='flex items-center gap-3 p-3 bg-muted/50 rounded-lg'>
                  <TbFileImport size={20} className='text-primary flex-shrink-0' />
                  <span>{t('editor.empty.drag')}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {isDragActive && (
          <div className='drop-indicator pointer-events-none absolute inset-0 flex items-center justify-center p-4'>
            <div className='drop-indicator__panel text-center'>
              <TbFileImport size={28} className='mx-auto mb-3 text-primary' />
              <p className='drop-indicator__title'>
                {t('editor.drop.title', { defaultValue: dropTitleDefault })}
              </p>
              <p className='drop-indicator__description'>{t('editor.empty.drag')}</p>
            </div>
          </div>
        )}
      </div>

      <TTSMenu
        ref={ttsMenu.menuRef}
        isOpen={ttsMenu.isOpen}
        items={ttsMenu.items}
        query={ttsMenu.query}
        path={ttsMenu.path}
        selectedIndex={ttsMenu.selectedIndex}
        position={ttsMenu.position}
        recentVoices={ttsMenu.recentVoices}
        onQueryChange={ttsMenu.setQuery}
        onSelect={ttsMenu.selectItem}
        onGoBack={ttsMenu.goBack}
        onClose={ttsMenu.closeMenu}
        onSelectRecentVoice={ttsMenu.selectRecentVoice}
      />

      <TTSBubbleMenu
        ref={ttsBubbleMenu.menuRef}
        isOpen={ttsBubbleMenu.isOpen}
        position={ttsBubbleMenu.position}
        fields={ttsBubbleMenu.fields}
        onFieldChange={ttsBubbleMenu.setFieldValue}
        onClear={ttsBubbleMenu.clearMark}
      />
    </TooltipProvider>
  )
}))

export default Tiptap
