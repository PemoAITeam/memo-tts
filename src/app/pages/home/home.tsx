/* eslint-disable no-case-declarations */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inject, observer } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { IoStopCircleOutline } from 'react-icons/io5';
import type { Editor } from '@tiptap/react';

import Tiptap from '@/app/components/business/tiptap';
import TTSPanel, { type VoiceOptions } from '@/app/components/business/tts-panel';
import { Button } from '@/app/components/ui/button';
import { useToast } from '@/app/components/ui/use-toast';
import { generateUUID, secondsToHMS, updateTemoData } from '@/app/lib/utils';
import type { BgmData } from '@/app/interface';
import type AppStore from '@/app/stores/appStore';
import type DataStore from '@/app/stores/dataStore';
import type SettingStore from '@/app/stores/settingStore';

interface HomePageProps {
  settingStore?: SettingStore
  dataStore?: DataStore
  appStore?: AppStore
}

const HomePage = inject('settingStore', 'dataStore', 'appStore')(observer(({ dataStore, appStore }: HomePageProps) => {
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

  useEffect(() => {
    if (dataStore?.editorData) {
      setCurEditorData(dataStore.editorData)
    }
    if (dataStore?.bgm) {
      setBgm(dataStore.bgm)
    }
    setTtsType(dataStore?.CurTTSType)

    return () => {
      setCurEditorData('')
    }
  }, [])

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
  }, [])

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
        result.voiceLocalName = result.voiceLocalName || selection.displayLabel
        result.ttsOptions = result.ttsOptions || selection
        result.duration = secondsToHMS(result.metadata?.duration)
        dataStore?.setTemoData(updateTemoData(result))
        editorRef?.commands.clearContent()
        editorRef?.chain().insertContentAt(editorRef.state.selection.head, { type: 'editorCard' }).focus().run()
        dataStore?.setEditorData('')
        dataStore?.setBgm(null)
        dataStore?.setTTSType('audio', true)
        appStore?.setTemoId('history')
        navigate(`/history/${result.uuid}`)
      }
    } catch (error) {
      console.log(error)
    }
  }

  const stopGenerateAudio = () => {
    window.AIM.tts.abortMergeTemo()
  }

  return (
    <div className="flex flex-col h-full">
      <div className='flex flex-1 temo-draggable pt-4 overflow-hidden'>
        <div className='flex-1 pl-4 pb-4 flex temo-no-draggable'>
          <div className='flex flex-col flex-1 border h-full p-3 pr-0 rounded-md'>
            <Tiptap
              content={curEditorData}
              type={ttsType}
              bgmData={bgm}
              setEditor={setEditorRef}
              getBgm={setBgm}
              from='home'
              ttsProvider={provider || selection?.provider}
              onProviderChange={setProvider}
            />
          </div>
          <div className='px-4 flex-shrink-0 tts-service-panel'>
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
          </div>
        </div>
      </div>
    </div>
  )
}))

export default HomePage
