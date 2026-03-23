/* eslint-disable no-case-declarations */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { inject, observer } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { IoStopCircleOutline } from 'react-icons/io5';
import type { Editor } from '@tiptap/react';

import HistoryAudioPlayer from '@/app/components/business/history-audio-player';
import Tiptap from '@/app/components/business/tiptap';
import TTSPanel, { type VoiceOptions } from '@/app/components/business/tts-panel';
import { Button } from '@/app/components/ui/button';
import { useToast } from '@/app/components/ui/use-toast';
import { generateUUID, getLocalFileUrl, secondsToHMS, updateTemoData } from '@/app/lib/utils';
import type { BgmData, TemoData } from '@/app/interface';
import type AppStore from '@/app/stores/appStore';
import type DataStore from '@/app/stores/dataStore';
import type SettingStore from '@/app/stores/settingStore';

interface HomePageProps {
  settingStore?: SettingStore
  dataStore?: DataStore
  appStore?: AppStore
}

const HomePage = inject('settingStore', 'dataStore', 'appStore')(observer(({ dataStore, appStore }: HomePageProps) => {
  const { id } = useParams()
  const location = useLocation()
  const [provider, setProvider] = useState<string>('')
  const [curEditorData, setCurEditorData] = useState<any>()
  const [editorRef, setEditorRef] = useState<Editor>()
  const [selection, setSelection] = useState<VoiceOptions>()
  const [bgm, setBgm] = useState<BgmData>()
  const [ttsType, setTtsType] = useState<'audio' | 'video'>()

  const navigate = useNavigate()
  const { t } = useTranslation()
  const { toast } = useToast()
  const { currentTTSProgress, currentTTSUUID, mergeTemo, synthesizing } = dataStore!
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastAutoplayTokenRef = useRef<number | null>(null)
  const selectedHistoryItem = id ? dataStore?.temoData.find((item) => item.uuid === id) : undefined
  const currentFile = selectedHistoryItem ? updateTemoData(selectedHistoryItem) : undefined
  const isHistoryMode = !!currentFile
  const autoplayState = location.state as { autoplayId?: string; autoplayToken?: number } | null
  const autoplayToken = autoplayState && currentFile && autoplayState.autoplayId === currentFile.uuid
    ? autoplayState.autoplayToken
    : undefined

  useEffect(() => {
    if (currentFile) {
      setCurEditorData(currentFile.editorData)
      setBgm(currentFile.bgm)
      setTtsType(currentFile.type)
      return
    }

    if (dataStore?.editorData) {
      setCurEditorData(dataStore.editorData)
    }
    setBgm(dataStore?.bgm || undefined)
    setTtsType(dataStore?.CurTTSType)
  }, [currentFile, dataStore?.CurTTSType, dataStore?.bgm, dataStore?.editorData])

  useEffect(() => {
    if (currentFile?.type !== 'video' || !autoplayToken) {
      return
    }

    if (lastAutoplayTokenRef.current === autoplayToken) {
      return
    }

    const media = videoRef.current
    if (!media) {
      return
    }

    lastAutoplayTokenRef.current = autoplayToken

    const playMedia = async () => {
      try {
        media.currentTime = 0
        await media.play()
      } catch (_error) {
        toast({
          variant: 'destructive',
          description: t('history.play fail', { defaultValue: '音频播放失败' }),
        })
      }
    }

    if (media.readyState >= 1) {
      void playMedia()
      return
    }

    const handleLoadedMetadata = () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata)
      void playMedia()
    }

    media.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [autoplayToken, currentFile?.type, t, toast])

  const handler = useCallback((_event: any, messageData: any) => {
    switch (messageData.type) {
      case 'temo:audio:abort':
        console.log('temo:audio:abort')
        break
      case 'temo:audio:error':
        console.log(messageData)
        const error = messageData.data?.message
        if (typeof error === 'string' && error.includes('Unsupported voice')) {
          toast({
            variant: 'destructive',
            description: t('Unsupported voice'),
          })
        } else if (error) {
          toast({
            variant: 'destructive',
            description: error,
          })
        }
        break
    }
  }, [t, toast])

  useEffect(() => {
    window.AIM?.handleMessage(handler, 'MemoTTSContent')

    return () => {
      window.AIM.removeHandler('MemoTTSContent')
    }
  }, [handler])

  const generateAudio = async () => {
    if (!selection) {
      toast({
        variant: 'destructive',
        description: t('tts.select voice', { defaultValue: 'Please select a TTS plugin and voice first.' }),
      })
      return
    }

    try {
      const result = await mergeTemo({
        selection,
        uuid: generateUUID(),
        editorData: editorRef?.getJSON(),
        bgm,
      })

      if (result) {
        const nextResult = updateTemoData({
          ...result,
          voiceLocalName: result.voiceLocalName || selection.displayLabel,
          ttsOptions: result.ttsOptions || selection,
          duration: secondsToHMS(result.metadata?.duration),
        })
        dataStore?.upsertTemoData(nextResult)
        editorRef?.commands.clearContent()
        editorRef?.chain().insertContentAt(editorRef.state.selection.head, { type: 'editorCard' }).focus().run()
        dataStore?.setEditorData('')
        dataStore?.setBgm(null)
        dataStore?.setTTSType('audio', true)
        appStore?.setTemoId(nextResult.uuid)
        navigate(`/home/${nextResult.uuid}`)
      }
    } catch (error) {
      console.log(error)
    }
  }

  const stopGenerateAudio = () => {
    window.AIM.tts.abortMergeTemo()
  }

  const updateHistoryItem = (result: TemoData) => {
    dataStore?.upsertTemoData(result)
    appStore?.setTemoId(result.uuid)
    navigate(`/home/${result.uuid}`)
  }

  return (
    <div className="flex flex-col h-full">
      <div className='flex flex-1 temo-draggable pt-4 overflow-hidden'>
        <div className='flex-1 pl-4 pb-4 flex temo-no-draggable'>
          <div className='flex flex-col flex-1 border h-full p-3 pr-0 rounded-md'>
            <Tiptap
              key={currentFile?.uuid || 'draft'}
              content={curEditorData}
              type={ttsType}
              bgmData={bgm}
              setEditor={isHistoryMode ? undefined : setEditorRef}
              getBgm={setBgm}
              from={isHistoryMode ? undefined : 'home'}
              currentFile={currentFile}
              updateList={isHistoryMode ? updateHistoryItem : undefined}
              ttsProvider={isHistoryMode ? undefined : provider || selection?.provider}
              onProviderChange={isHistoryMode ? undefined : setProvider}
            />
            {currentFile?.fileUrl && (
              <div className='mr-3 mt-4'>
                {currentFile.type === 'video'
                  ? (
                    <div className='overflow-hidden rounded-[1.5rem] border border-border/70 bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--background))_55%,hsl(var(--muted)/0.8)_100%)] p-2 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.28)]'>
                      <video
                        ref={videoRef}
                        className='w-full max-h-64 rounded-[1rem] bg-black'
                        controls
                        src={getLocalFileUrl(currentFile.fileUrl)}
                      />
                    </div>
                  )
                  : (
                    <HistoryAudioPlayer
                      src={getLocalFileUrl(currentFile.fileUrl)}
                      autoplayToken={autoplayToken}
                    />
                  )}
              </div>
            )}
          </div>
          {!isHistoryMode && <div className='px-4 flex-shrink-0 tts-service-panel'>
            <TTSPanel voiceOptions={selection} getOptions={setSelection} />
            {currentTTSUUID ? (
              <Button
                variant="outline"
                className='w-full mt-6 relative overflow-hidden'
                onClick={stopGenerateAudio}
              >
                <IoStopCircleOutline size={16} />
                <span>{t('tts.synthesis')}</span>
                <span>{`${currentTTSProgress}%`}</span>
                <div style={{ width: `${currentTTSProgress}%` }} className='left-0 top-0 h-full absolute opacity-50 bg-primary' />
              </Button>
            ) : (
              <Button className='mt-6 w-full' disabled={synthesizing || !selection} onClick={generateAudio}>
                <span>{t('tts.synthesis')}</span>
              </Button>
            )}
          </div>}
        </div>
      </div>
    </div>
  )
}))

export default HomePage
