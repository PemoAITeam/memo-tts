import './tiptap.scss'
import './tts-mention-styles.scss'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef } from 'react'
import { inject, observer } from 'mobx-react'
import mammoth from 'mammoth'
import { remark } from 'remark'
import strip from 'strip-markdown'
import { useTranslation } from 'react-i18next'
import { TbEraser, TbLoader, TbWand } from 'react-icons/tb'
import { IoStopCircleOutline } from 'react-icons/io5'

import { EditorCard } from '../extensions/editor-card'
import { EventHandler } from '../extensions/paste-plugin'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip'
import SelectTTSProvider from './SelectTTSProvider'
import { TTSMenu } from './tts-menu'
import { TTSBubbleMenu } from './tts-bubble-menu'
import { toast } from '../ui/use-toast'
import { generateUUID, normalizeEditorDocument } from '@/app/lib/utils'
import type DataStore from '@/app/stores/dataStore'
import type PluginStore from '@/app/stores/pluginStore'
import {
  TTSMentionSimple,
  TTSMentionNode,
  TTSMark,
  useTTSBubbleMenu,
  useTTSMentionMenu,
} from '@/app/lib/tts-mention'

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
}: TiptapProps) => {
  const { t } = useTranslation()

  const effectiveProvider = ttsProvider || pluginStore?.provider
  const effectiveProviderConfigKey = effectiveProvider
    ? stableSerializeConfig(pluginStore?.getRuntimeTTSConfiguration(effectiveProvider) || {})
    : ''

  const handleTTSMenuOpenRef = useRef<(props: { range: { from: number; to: number }; query: string }) => void>()
  const handleTTSMenuCloseRef = useRef<() => void>()

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

      dataStore?.setEditorData(props.editor.getJSON())
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
  }, [ttsMenu])

  useEffect(() => {
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
    })
  }, [content, editor])

  const clear = () => {
    editor?.commands.clearContent()
    editor?.chain().insertContentAt(editor.state.selection.head, { type: 'editorCard' }).focus().run()
  }

  const handleDrop = (event: any) => {
    event.preventDefault()

    const file = event.dataTransfer.files[0]
    const reader = new FileReader()

    if (file.type === 'text/plain') {
      reader.readAsText(file)
      reader.onload = (nextEvent) => {
        const text = nextEvent.target?.result as string
        editor?.chain().insertContentAt(editor.state.selection.head, text).focus().run()
      }
      return
    }

    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
      reader.onloadend = () => {
        const arrayBuffer = reader.result as ArrayBuffer
        if (arrayBuffer) {
          mammoth.extractRawText({ arrayBuffer }).then((resultObject) => {
            editor?.chain().insertContentAt(editor.state.selection.head, resultObject.value).focus().run()
          })
        }
      }
      reader.readAsArrayBuffer(file)
      return
    }

    const type = file.name.split('.').pop()
    if (type === 'md') {
      reader.onload = (nextEvent) => {
        const markdownText = nextEvent.target?.result as string

        remark()
          .use(strip)
          .process(markdownText, (error, result) => {
            if (error) {
              throw error
            }

            const text = result?.toString()
            if (text) {
              editor?.chain().insertContentAt(editor.state.selection.head, text).focus().run()
            }
          })
      }
      reader.readAsText(file)
      return
    }

    toast({
      variant: 'destructive',
      description: 'Only txt, docx, and md files are supported.',
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
        className='flex-1 overflow-y-auto pr-3'
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => event.preventDefault()}
      >
        <EditorContent editor={editor} />
      </div>

      <TTSMenu
        ref={ttsMenu.menuRef}
        isOpen={ttsMenu.isOpen}
        items={ttsMenu.items}
        query={ttsMenu.query}
        path={ttsMenu.path}
        selectedIndex={ttsMenu.selectedIndex}
        position={ttsMenu.position}
        onQueryChange={ttsMenu.setQuery}
        onSelect={ttsMenu.selectItem}
        onGoBack={ttsMenu.goBack}
        onClose={ttsMenu.closeMenu}
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
