/* eslint-disable no-case-declarations */
import { Button } from '@/app/components/ui/button';
import Tiptap from '@/app/components/business/tiptap';
import { useCallback, useEffect, useState } from 'react';

import { secondsToHMS, generateUUID, updateTemoData } from '@/app/lib/utils';
import { Editor } from '@tiptap/react';
import { TTSOptions } from '@/app/lib/tts';
import { inject, observer } from 'mobx-react';
import SettingStore from '@/app/stores/settingStore';
import DataStore from '@/app/stores/dataStore';
import AppStore from '@/app/stores/appStore';
import TTSPanel from '@/app/components/business/tts-panel';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/app/components/ui/use-toast';
import { BgmData } from '@/app/interface';
import { useNavigate } from 'react-router-dom';
import { IoStopCircleOutline } from 'react-icons/io5';
import SelectTTSProvider from '@/app/components/business/SelectTTSProvider';
interface HomePageProps {
  settingStore?: SettingStore
  dataStore?: DataStore
  appStore?: AppStore
}

const HomePage = inject('settingStore', 'dataStore', 'appStore')(observer(({ dataStore, appStore }: HomePageProps) => {

  const [service, setService] = useState<'Edge' | 'OpenAI' | 'Volcano'>('Edge')
  const [curEditorData, setCurEditorData] = useState<any>()
  const [speed, setSpeed] = useState<string>('1')
  const [target, setTarget] = useState<'original' | 'translate'>('original')
  const [editorRef, setEditorRef] = useState<Editor>();
  const [options, setOptions] = useState<TTSOptions>()
  // const [currentFile, setCurrentFile] = useState<TemoData>();
  const [bgm, setBgm] = useState<BgmData>();
  const [ttsType, setTtsType] = useState<'audio' | 'video'>();
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { toast } = useToast()

  const { currentTTSProgress, currentTTSUUID, mergeTemo, synthesizing } = dataStore!

  useEffect(() => {
    if (dataStore?.editorData) {
      setCurEditorData(dataStore.editorData)
    }
    if (dataStore?.bgm) {
      setBgm(dataStore?.bgm)
    }
    setTtsType(dataStore?.CurTTSType)
    return () => {
      setCurEditorData("")
    }

  }, []);
  const handler = useCallback((_event: any, messageData: any) => {
    switch (messageData.type) {
      // case 'translate:start':
      //     console.log(messageData.data.type + '翻译开始', messageData.data);
      //     break;
      // case 'translate:progress':
      //     console.log('进度：', (messageData.data[0].index + 1) / getContent().length * 100 + '%', messageData.data[0].text);
      //     break;
      // case 'translate:message':
      //     console.log('翻译消息', messageData.data[0].text);
      //     break;
      case 'temo:audio:abort':
        console.log('翻译中止');
        break;
      case 'temo:audio:error':
        console.log(messageData)
        const error = messageData.data?.message;
        if (error.includes('Unsupported voice')) {
          toast({
            variant: "destructive",
            description: t('Unsupported voice')
          })
        } else {
          toast({
            variant: "destructive",
            description: error
          })
        }
        break
    }
  }, [])
  useEffect(() => {
    window.AIM?.handleMessage(handler, 'MemoTTSContent') // MemoTTSTranslateContent是唯一标识，可以用于区分不同的消息监听

    return () => {
      // 组件销毁时移除事件监听
      window.AIM.removeHandler('MemoTTSContent')
    }
  }, [handler]) // handler更新时重新注册事件

  const generateAudio = async () => {
    console.log({ target, service, speed, uuid: generateUUID(), editorData: editorRef?.getJSON(), bgm }, options);
    try {
      const result = await mergeTemo({ target, service, speed, uuid: generateUUID(), editorData: editorRef?.getJSON(), bgm }, options)
      if (result) {
        result.duration = secondsToHMS(result.metadata?.duration)
        dataStore?.setTemoData(updateTemoData(result))
        editorRef?.commands.clearContent();
        editorRef?.chain().insertContentAt(editorRef.state.selection.head, { type: 'editorCard' }).focus().run()
        dataStore?.setEditorData("")
        dataStore?.setBgm(null)
        dataStore?.setTTSType('audio', true)
        // setCurrentFile(result)
        appStore?.setTemoId("history")
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
    <>
      <div className="flex flex-col h-full">
        <div className='flex flex-1 temo-draggable pt-4 overflow-hidden'>
          <div className='flex-1 pl-4 pb-4 flex temo-no-draggable'>
            <div className='flex  flex-col flex-1 border h-full p-3 pr-0 rounded-md'>
              <div className="mb-1 text-sm">{t('tts.provider')}</div>
              <SelectTTSProvider onChange={setService} />
              <Tiptap content={curEditorData} type={ttsType} bgmData={bgm} setEditor={setEditorRef} getBgm={setBgm} from='home' />
            </div>
            <div className='px-4 flex-shrink-0 tts-service-panel'>
              <TTSPanel getSpeed={setSpeed} getTarget={setTarget} getOptions={setOptions} onProviderChange={setService}></TTSPanel>
              {
                currentTTSUUID ? (
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
                  <Button className='mt-6 w-full' disabled={synthesizing} onClick={generateAudio}>
                    <span>{t('tts.synthesis')}</span>
                  </Button>
                )
              }
            </div>
          </div>
        </div>
      </div>
    </>
  )
}))

export default HomePage
