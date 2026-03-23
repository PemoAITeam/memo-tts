import './tiptap.scss'
import './tts-mention-styles.scss'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { inject, observer } from 'mobx-react'
import { cloneDeep } from 'lodash-es'
import mammoth from 'mammoth'
import { remark } from 'remark'
import strip from 'strip-markdown'
import { useTranslation } from 'react-i18next'
import { TbEraser, TbLanguage, TbLoader, TbWand } from 'react-icons/tb'
import { MdOutlineMusicNote } from 'react-icons/md'
import { BsPause, BsPlay } from 'react-icons/bs'
import { IoStopCircleOutline } from 'react-icons/io5'
import { IoIosClose } from 'react-icons/io'

import { EditorCard } from '../extensions/editor-card'
import { EventHandler } from '../extensions/paste-plugin'
import { TranslateCard } from '../extensions/translate-card'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import TTSDialog from './tts-dialog'
import TranslatePanel from './translate-panel'
import SelectTTSProvider from './SelectTTSProvider'
import { TTSMenu } from './tts-menu'
import { TTSBubbleMenu } from './tts-bubble-menu'
import { toast } from '../ui/use-toast'
import type { BgmData, WhisperSegments } from '@/app/interface'
import { generateUUID, getLocalFileUrl, mergeTranslate, secondsToHMS } from '@/app/lib/utils'
import type DataStore from '@/app/stores/dataStore'
import type PluginStore from '@/app/stores/pluginStore'
import {
  TTSMentionSimple,
  TTSMentionNode,
  TTSMark,
  useTTSBubbleMenu,
  useTTSMentionMenu,
  type SelectedVoiceConfig,
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
  getBgm?: (bgm?: { name: string; path: string; duration: number }) => void
  content?: any
  bgmData?: BgmData
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
  getBgm,
  bgmData,
  ttsProvider,
  onProviderChange,
  onSynthesize,
  onStopSynthesis,
  synthesisActive,
  synthesisBusy,
  synthesisDisabled,
  synthesisProgress,
}: TiptapProps) => {
  const [openTranslate, setOpenTranslate] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [ttsType, setTtsType] = useState<'video' | 'audio'>('audio')
  const [openDialog, setOpenDialog] = useState(false)
  const [bgm, setBgm] = useState<BgmData | undefined>(bgmData)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
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
      TranslateCard,
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

  const handleVoiceSelect = (_config: SelectedVoiceConfig) => {}

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

      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        setIsPlaying(false)
      }
    }
  }, [editor, setEditor])

  useEffect(() => {
    if (!editor) {
      return
    }

    if (content && typeof content === 'object') {
      const nextContentKey = stableSerializeConfig(content)
      const currentContentKey = stableSerializeConfig(editor.getJSON())

      if (nextContentKey === currentContentKey) {
        return
      }
    }

    Promise.resolve().then(() => {
      editor.commands.setContent(content || '<editor-card></editor-card>')
    })
  }, [content, editor])

  useEffect(() => {
    if (dataStore?.TTSType) {
      setTtsType(dataStore.TTSType)
    }

    setBgm(bgmData || undefined)
  }, [bgmData, dataStore?.TTSType])

  useEffect(() => {
    return () => {
      dataStore?.setTTSType('audio')
      setBgm(undefined)
    }
  }, [dataStore])

  const clear = () => {
    editor?.commands.clearContent()
    editor?.chain().insertContentAt(editor.state.selection.head, { type: 'editorCard' }).focus().run()
  }

  const getContent = () => {
    const jsonData = editor?.getJSON()
    const originalData = jsonData?.content?.filter((item) => item.type === 'editorCard')
    const data = originalData
      ?.map((item, index) => ({ text: item.content ? item.content[0].text : '', index }))
      .filter((item) => !!item.text?.length)

    return data || []
  }

  const addTranslate = (translateData: WhisperSegments[]) => {
    const jsonData = editor?.getJSON()
    const editorContent = cloneDeep(jsonData?.content)

    if (editorContent?.length) {
      const list = mergeTranslate(
        editorContent.filter((item) => item.type === 'editorCard'),
        translateData,
      ).map((item) => (item.content && !item.content[0].text.length ? { type: item.type, attrs: item.attrs } : item))

      setTranslating(false)
      editor?.chain().setContent({ type: 'doc', content: list }, true).focus().run()
    }
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

  const selectBgm = (filePath: string) => {
    const fileName = filePath.replace(/^.*[\\/]/, '')
    const audio = audioRef.current

    if (!audio) {
      return
    }

    audio.src = getLocalFileUrl(filePath)

    const handleLoadedMetadata = () => {
      const duration = audio.duration
      const nextBgm = { name: fileName, path: filePath, duration }

      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      dataStore?.copyLibraryFile(filePath, secondsToHMS(duration))
      dataStore?.setBgm(nextBgm)
      getBgm?.(nextBgm)
      setBgm(nextBgm)
      setOpenDialog(false)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
  }

  const playBgm = (event?: MouseEvent<SVGElement>) => {
    event?.stopPropagation()

    const audio = audioRef.current
    if (!audio) {
      return
    }

    if (isPlaying) {
      audio.pause()
    } else if (bgm?.path) {
      audio.src = getLocalFileUrl(bgm.path)
      void audio.play()
    }

    setIsPlaying(!isPlaying)
  }

  const deleteBgm = (event?: MouseEvent<SVGElement>) => {
    event?.stopPropagation()

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }

    setIsPlaying(false)
    dataStore?.setBgm(null)
    getBgm?.()
    setBgm(undefined)
  }

  return (
    <>
      <div className='flex items-center flex-shrink-0 justify-between mb-4 pr-3'>
        <div className='flex flex-1 items-center gap-3 pr-3'>
          <span className='text-sm whitespace-nowrap text-muted-foreground'>{t('tts.provider')}</span>
          <div className='w-full max-w-52'>
            <SelectTTSProvider onChange={onProviderChange || (() => undefined)} />
          </div>
        </div>
        <div className='flex items-center flex-shrink-0 gap-1'>
          {synthesisActive
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
                disabled={synthesisDisabled || !onSynthesize}
                onClick={onSynthesize}
              >
                {synthesisBusy
                  ? <TbLoader className='transition-colors ease-linear animate-spin' size={16} />
                  : <TbWand size={16} />}
                <span>{t('tts.synthesis')}</span>
              </Button>
            )}

          {ttsType === 'video' && (
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button aria-label={t('tts.select music')} variant='ghost' size='sm'>
                  {!bgm && <MdOutlineMusicNote size={18} />}
                  {(bgm && isPlaying) && <BsPause onClick={playBgm} size={18} />}
                  {(bgm && !isPlaying) && <BsPlay onClick={playBgm} size={18} />}
                  <span className='text-sm ml-1'>{bgm ? bgm.name : t('tts.select music')}</span>
                  {!!bgm && <IoIosClose size={16} className='absolute -top-2 -right-3' onClick={deleteBgm} />}
                </Button>
              </DialogTrigger>
              <DialogContent className='pic-dialog w-2/3 h-2/3 max-w-none'>
                <TTSDialog selectImage={selectBgm} />
              </DialogContent>
            </Dialog>
          )}

          <Popover open={openTranslate} onOpenChange={setOpenTranslate}>
            <PopoverTrigger asChild>
              <Button aria-label={t('app.translate')} variant='ghost' size='sm'>
                {translating ? <TbLoader className='transition-colors ease-linear animate-spin' /> : <TbLanguage />}
                <span className='text-sm'>{t('app.translate')}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto'>
              <TranslatePanel
                startTranslate={setTranslating}
                getTranslateData={addTranslate}
                getContent={getContent}
                closePanel={() => setOpenTranslate(false)}
              />
            </PopoverContent>
          </Popover>

          <Button aria-label={t('app.clear')} variant='ghost' size='sm' onClick={clear}>
            <TbEraser size={18} />
            <span className='text-sm'>{t('app.clear')}</span>
          </Button>
        </div>
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
      <audio className='audioRef' ref={audioRef} controls />

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
    </>
  )
}))

export default Tiptap
