import './tiptap.scss'
import './tts-mention-styles.scss'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { EditorCard } from '../extensions/editor-card'
import { useEffect, useRef, useState } from 'react'
import { EventHandler } from '../extensions/paste-plugin'
import { TranslateCard } from '../extensions/translate-card'
import { generateUUID, getLocalFileUrl, mergeTranslate, secondsToHMS, updateTemoData } from '@/app/lib/utils'
import { Button } from '../ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import TranslatePanel from './translate-panel'
import { TbEraser, TbLanguage, TbLoader, TbMicrophone, TbWand } from 'react-icons/tb'
import { BgmData, TemoData, WhisperSegments } from '@/app/interface'
import { cloneDeep } from 'lodash-es'
import mammoth from 'mammoth'
import { toast } from '../ui/use-toast'
import { remark } from 'remark'
import strip from 'strip-markdown'
import { useTranslation } from 'react-i18next'
import { inject, observer } from 'mobx-react'
import DataStore from '@/app/stores/dataStore'
// import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import { MdOutlineMusicNote } from "react-icons/md";
import { BsPause, BsPlay } from "react-icons/bs";
import TTSPanel, { VoiceOptions } from './tts-panel'
import AppStore from '@/app/stores/appStore'
import { Dialog, DialogContent, DialogTrigger } from '../ui/dialog'
import TTSDialog from './tts-dialog'
import { IoIosClose } from 'react-icons/io'
// TTS Mention 扩展
import { TTSMentionSimple, TTSMentionNode, useTTSMentionMenu, SelectedVoiceConfig, TTSMark, useTTSBubbleMenu } from '@/app/lib/tts-mention'
import { TTSMenu } from './tts-menu'
import { TTSBubbleMenu } from './tts-bubble-menu'

interface TiptapProps {
  setEditor?: (editor: Editor) => void,
  getBgm?: (bgm: { name: string, path: string, duration: number }) => void,
  content?: any,
  from?: string,
  type?: 'audio' | 'video',
  bgmData?: BgmData,
  dataStore?: DataStore,
  appStore?: AppStore,
  currentFile?: TemoData,
  updateList?: (data: TemoData) => void,
  ttsProvider?: 'Edge' | 'OpenAI' | 'Volcano'
}

const Tiptap = inject('settingStore', 'dataStore', 'appStore')(observer(({ setEditor, content, from, dataStore, updateList, getBgm, bgmData, currentFile, ttsProvider }: TiptapProps) => {
  const [openTranslate, setOpenTranslate] = useState(false)
  const [translating, setTranslating] = useState<boolean>(false)
  const [openSynthesis, setOpenSynthesis] = useState<boolean>(false)
  const [curOptions, setCurOptions] = useState<VoiceOptions>()
  const [TTSType, setTTSType] = useState<'video' | 'audio'>('audio')
  const [voice, setVoice] = useState<string>();
  const [openDialog, setOpenDialog] = useState(false);
  const [originalVoice, setOriginalVoice] = useState<string>()
  const { synthesizing } = dataStore!
  const { t } = useTranslation()
  const usePlugin = useRef(false)

  const { mergeTemo } = dataStore!

  // TTS Mention 菜单回调 - 先定义，以便传递给 extension
  const handleTTSMenuOpenRef = useRef<(props: { range: { from: number; to: number }; query: string }) => void>()
  const handleTTSMenuCloseRef = useRef<() => void>()

  // 创建编辑器
  const editor = useEditor({
    extensions: [
      StarterKit,
      EditorCard,
      TranslateCard,
      EventHandler,
      // TTS Mention 扩展 - 配置回调
      TTSMentionNode,
      TTSMentionSimple.configure({
        onMenuOpen: (props) => {
          handleTTSMenuOpenRef.current?.(props)
        },
        onMenuClose: () => {
          handleTTSMenuCloseRef.current?.()
        },
      }),
      // TTS Mark 扩展 - 用于 Bubble Menu
      TTSMark,
    ],
    autofocus: true,
    enablePasteRules: false,
    onUpdate: (props) => {
      const jsonData = props.editor.getJSON();
      console.log(jsonData)
      const hasEditorCard = jsonData.content?.filter(item => item.type === 'editorCard')
      if (!hasEditorCard?.length) {
        props.editor.chain().insertContentAt(props.editor.state.selection.head, { type: 'editorCard', attrs: { id: generateUUID() } }).focus().run()
      }
      if (from === 'home') {
        const data = props.editor.getJSON()
        if (data) {
          dataStore?.setEditorData(data)
        }
      }
    }
  })

  // TTS Mention 菜单
  const handleVoiceSelect = (config: SelectedVoiceConfig) => {
    console.log('选中的语音配置:', config)
    // 可以在这里处理语音选择后的逻辑
  }
  const ttsMenu = useTTSMentionMenu(editor, {
    initialProvider: ttsProvider,
    onVoiceSelect: handleVoiceSelect,
  })

  // TTS Bubble Menu（选中文本后显示）
  const ttsBubbleMenu = useTTSBubbleMenu(editor, {
    provider: ttsProvider,
  })

  // TTS Mention 菜单回调 - 更新 ref
  useEffect(() => {
    handleTTSMenuOpenRef.current = (props: { range: { from: number; to: number }; query: string }) => {
      console.log('[Tiptap] TTS menu open callback:', props)
      ttsMenu.openMenu(props)
    }
    handleTTSMenuCloseRef.current = () => {
      console.log('[Tiptap] TTS menu close callback')
      ttsMenu.closeMenu()
    }
  }, [ttsMenu])

  const [bgm, setBgm] = useState<BgmData | undefined>(bgmData);
  const [selectedBgm, setSelectedBgm] = useState<boolean>(false)
  const audioRef = useRef<any>();
  const [isPlaying, setIsPlaying] = useState(false);
  useEffect(() => {
    if (setEditor) {
      setEditor(editor as Editor)
    }
    return () => {
      if (editor) {
        editor.destroy()
      }
      if (audioRef?.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        setIsPlaying(false);
      }
    }
  }, [editor, setEditor])

  useEffect(() => {
    // this is just an example. do whatever you want to do here
    // to retrieve your editors content from somewhere
    Promise.resolve().then(() => {
      // 在微任务中执行
      editor?.commands.setContent(content || `<editor-card></editor-card>`)
    });
  }, [editor, content])

  useEffect(() => {
    if (currentFile) {
      if (currentFile.type) {
        setTTSType(currentFile.type)
        dataStore?.setTTSType(currentFile.type)
      }
      setVoice(currentFile.voiceLocalName)
      if (currentFile.ttsOptions) {
        setCurOptions(currentFile.ttsOptions)
        const ttsOptions = currentFile.ttsOptions.ttsOptions
        if (currentFile.ttsOptions.service === 'Edge') {
          setVoice(ttsOptions?.voice?.properties?.LocalName)
          setOriginalVoice(ttsOptions?.voice?.properties?.LocalName)
        } else {
          setVoice(ttsOptions?.voice?.label)
          setOriginalVoice(ttsOptions?.voice?.label)
        }
      }
    } else if (dataStore?.TTSType) {
      setTTSType(dataStore.TTSType)
    }
    if (bgmData) {
      setBgm(bgmData)
    }

  }, [dataStore, bgmData, currentFile])

  useEffect(() => {
    return () => {
      dataStore?.setTTSType('audio')
      setBgm(undefined)
      setCurOptions(undefined)
    }
  }, [])

  const clear = () => {
    editor?.commands.clearContent();
    editor?.chain().insertContentAt(editor.state.selection.head, { type: 'editorCard' }).focus().run()
  }

  const getContent = () => {
    const jsonData = editor?.getJSON();
    const originalData = jsonData?.content?.filter(item => item.type === 'editorCard')
    const data = originalData?.map((item, index) => ({ text: item.content ? item.content[0].text : '', index })).filter(item => !!item.text?.length)
    return data || []
  }

  const addTranslate = (translateData: WhisperSegments[]) => {
    const jsonData = editor?.getJSON();
    const editorContent = cloneDeep(jsonData?.content);
    if (editorContent?.length) {
      const list = mergeTranslate(editorContent.filter(item => item.type === 'editorCard'), translateData).map(item => item.content && !item.content[0].text.length ? { type: item.type, attrs: item.attrs } : item)
      setTranslating(false)
      editor?.chain().setContent({ type: 'doc', content: list }, true).focus().run()
    }
  }

  const handleDrop = (event: any) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    const reader = new FileReader();
    if (file.type === 'text/plain') {
      reader.readAsText(file);
      reader.onload = e => { // 读取完毕从中取值
        const text = e.target?.result as string;
        editor?.chain().insertContentAt(editor.state.selection.head, text).focus().run()
        console.log('pointsTxt', text) // 获取到的TXT文件
      };
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
      reader.onloadend = function () {
        const arrayBuffer = reader.result as ArrayBuffer;
        if (arrayBuffer) {
          mammoth.extractRawText({ arrayBuffer: arrayBuffer }).then(function (resultObject) {
            editor?.chain().insertContentAt(editor.state.selection.head, resultObject.value).focus().run()
          })
        }

      };
      reader.readAsArrayBuffer(file);
    } else {
      const type = file.name.split('.').pop();
      if (type === 'md') {
        reader.onload = e => {
          const markdownText = e.target?.result as string;
          // 使用 remark 解析 Markdown
          remark()
            .use(strip) // 使用 strip 插件去除 Markdown 格式
            .process(markdownText, (err, file) => {
              if (err) throw err;

              // 提取的纯文本
              const text = file?.toString();
              if (text) {
                editor?.chain().insertContentAt(editor.state.selection.head, text).focus().run()
              }
            });
        };
        reader.readAsText(file); // 以文本格式读取文件
      } else {
        toast({
          variant: "destructive",
          description: `当前只支持解析txt、docx、md文档`
        })
      }
    }
  };

  const selectBgm = async (filePath: string) => {
    // const file: any = await window.AIM.openDialog('showOpenDialogSync', {
    //     properties: ['openFile'],
    //     filters: [{ name: '', extensions: ['mp3'] }]
    // })
    // if (!file) return
    // const filePath = file[0];

    const fileName = filePath.replace(/^.*[\\/]/, '');
    if (audioRef.current) {
      audioRef.current.src = getLocalFileUrl(filePath);
      // 使用loadedmetadata事件获取音频文件的duration
      audioRef.current.addEventListener('loadedmetadata', () => {
        const duration = audioRef.current.duration;
        // 在这里可以处理音频文件的时长
        const bgmData = { name: fileName, path: filePath, duration }
        dataStore!.copyLibraryFile(filePath, 'media', secondsToHMS(duration))
        getBgm && getBgm(bgmData)
        if (from === 'home') {
          dataStore?.setBgm(bgmData)
        } else {
          setSelectedBgm(true)
        }
        setBgm(bgmData);
        setOpenDialog(false)
      });
    }
  }

  const switchTTSType = (type: 'audio' | 'video') => {
    setTTSType(type)
    const needSaveType = from === 'home'
    dataStore?.setTTSType(type, needSaveType)
  }

  const playBgm = (event?: any) => {
    if (event) {
      event.stopPropagation();
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (bgm?.path) {
        audioRef.current.src = getLocalFileUrl(bgm.path)
        audioRef.current.play();
      }
    }
    setIsPlaying(!isPlaying);
  }

  const generateAudio = async () => {
    try {
      const result: TemoData = await mergeTemo({ target: curOptions!.target!, service: curOptions!.service!, speed: curOptions!.speed!, uuid: currentFile!.uuid, editorData: editor?.getJSON(), bgm }, curOptions!.ttsOptions!)
      if (result) {
        console.log(result)
        updateList && updateList(updateTemoData(result))
      }
    } catch (error) {
      console.log(error)
    }
  }

  const addVoice = (data: VoiceOptions) => {
    setOpenSynthesis(false)
    const ttsOptions = data.ttsOptions
    if (data.service === 'Edge') {
      setVoice(ttsOptions?.voice.properties.LocalName)
    } else {
      setVoice(ttsOptions?.voice.label)
    }
    setCurOptions(data)
  }

  const deleteBgm = (event?: any) => {
    if (event) {
      event.stopPropagation();
    }
    setBgm(undefined)
  }

  return (
    <>
      <div className='flex items-center flex-shrink-0 justify-between mb-4 pr-3'>
        {
          // from === 'home' && <Tabs value={TTSType}>
          //     <TabsList>
          //         <TabsTrigger value="audio" onClick={() => switchTTSType('audio')}>{t('tts.audio')}</TabsTrigger>
          //         <TabsTrigger value="video" onClick={() => switchTTSType('video')}>{t('tts.video')}</TabsTrigger>
          //     </TabsList>
          // </Tabs>
          <div></div>
        }
        <div className='flex items-center flex-shrink-0'>
          {from != 'home' && <Button aria-label={t('tts.synthesis')} variant={'ghost'} size={"sm"} disabled={synthesizing} onClick={generateAudio}>
            {
              synthesizing
                ? <TbLoader size={16} />
                : <TbWand size={16} />
            }
            <span>{t('tts.synthesis')}</span>
          </Button>}

          {TTSType === 'video' && <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button aria-label={t('tts.select music')} variant={'ghost'} size={"sm"}>
                {!bgm && <MdOutlineMusicNote size={18} />}
                {(bgm && isPlaying) && <BsPause onClick={playBgm} size={18} />}
                {(bgm && !isPlaying) && <BsPlay onClick={playBgm} size={18} />}
                <span className={`text-sm ml-1 ${selectedBgm ? ' text-indigo-600' : ''}`}>{bgm ? bgm.name : t('tts.select music')}</span>
                {!!bgm && <IoIosClose size={16} className=" absolute -top-2 -right-3" onClick={deleteBgm} />}
              </Button>
            </DialogTrigger>
            <DialogContent className="pic-dialog w-2/3 h-2/3 max-w-none">
              <TTSDialog selectImage={selectBgm} fileType="media"></TTSDialog>
            </DialogContent>
          </Dialog>}
          {from != 'home' && <Popover open={openSynthesis} onOpenChange={(open) => setOpenSynthesis(open)}>
            <PopoverTrigger asChild>
              <Button aria-label={t('tts.tts')} variant={'ghost'} size={"sm"}>
                <TbMicrophone />
                <span className={`${voice !== originalVoice ? ' text-indigo-600' : ''}`}> {voice} </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto">
              <TTSPanel getVoiceOptions={addVoice} showConfirmButton />
              {/* <Button title={t('app.sure')} className="w-full mt-2" onClick={() => addVoice()}>
                                <span>{t('app.sure')}</span>
                            </Button> */}
            </PopoverContent>
          </Popover>}

          {
            !usePlugin.current && <Popover open={openTranslate} onOpenChange={(open) => setOpenTranslate(open)}>
              <PopoverTrigger asChild>
                <Button aria-label={t('app.translate')} variant={'ghost'} size={"sm"}>
                  {translating ? <TbLoader className='transition-colors ease-linear animate-spin' /> : <TbLanguage />}
                  <span className="text-sm">{t('app.translate')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto">
                <TranslatePanel startTranslate={setTranslating} getTranslateData={addTranslate} getContent={getContent} closePanel={() => setOpenTranslate(false)}  ></TranslatePanel>
              </PopoverContent>
            </Popover>
          }
          <Button aria-label={t('app.clear')} variant={'ghost'} size={"sm"} onClick={clear}>
            <TbEraser size={18} />
            <span className="text-sm">{t('app.clear')}</span>
          </Button>
        </div>
      </div>
      <div id="drop-area" className='flex-1 overflow-y-auto pr-3'
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => event.preventDefault()}>
        <EditorContent editor={editor} />
      </div>
      <audio className='audioRef' ref={audioRef} controls></audio>

      {/* TTS Mention 菜单 */}
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

      {/* TTS Bubble Menu（选中文本后显示） */}
      <TTSBubbleMenu
        ref={ttsBubbleMenu.menuRef}
        isOpen={ttsBubbleMenu.isOpen}
        position={ttsBubbleMenu.position}
        speed={ttsBubbleMenu.speed}
        emotion={ttsBubbleMenu.emotion}
        emotionOptions={ttsBubbleMenu.getEmotionOptions()}
        onSpeedChange={ttsBubbleMenu.setSpeed}
        onEmotionChange={ttsBubbleMenu.setEmotion}
        onClear={ttsBubbleMenu.clearMark}
      />
    </>
  )
}))

export default Tiptap