/* eslint-disable no-case-declarations */
import { Button } from '@/app/components/ui/button';
import Tiptap from '@/app/components/business/tiptap';
import { useCallback, useEffect, useState } from 'react';

import { secondsToHMS, generateUUID, updateTemoData } from '@/app/lib/utils';
import { AiOutlineLoading3Quarters } from "react-icons/ai";
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
// import { Remotion } from '@/app/components/business/remotion';
import { useNavigate } from 'react-router-dom';

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
    const [generating, setGenerating] = useState(false)
    const [editorRef, setEditorRef] = useState<Editor>();
    const [options, setOptions] = useState<TTSOptions>()
    // const [currentFile, setCurrentFile] = useState<TemoData>();
    const [bgm, setBgm] = useState<BgmData>();
    const [ttsType, setTtsType] = useState<'audio' | 'video'>();
    const navigate = useNavigate()
    const { t } = useTranslation()
    const { toast } = useToast()

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
            case 'text:audio:abort':
                console.log('翻译中止');
                break;
            case 'text:audio:error':
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
        try {
            const result = await dataStore?.mergeTemo({ setGenerating, target, service, speed, uuid: generateUUID(), editorData: editorRef?.getJSON(), bgm }, options)
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
            setGenerating(false);
            console.log(error)
        }
    }

    return (
        <>
            <div className="flex flex-col h-full">
                <div className='flex flex-1 temo-draggable pt-12 overflow-hidden'>
                    <div className='flex-1 pl-4 pb-4 flex temo-no-draggable'>
                        {/* {!!currentFile && <div className=' flex-shrink-0 tts-remotion mt-3 mb-3 mr-3'>
                            <div>{currentFile.title}</div>
                            <Remotion temoData={currentFile}></Remotion>
                        </div>} */}
                        <div className='flex  flex-col flex-1 border h-full p-3 pr-0 rounded-md'>
                            <Tiptap content={curEditorData} type={ttsType} bgmData={bgm} setEditor={setEditorRef} getBgm={setBgm} from='home' />
                        </div>
                        <div className='px-4 flex-shrink-0 tts-service-panel'>
                            <TTSPanel getSpeed={setSpeed} getTarget={setTarget} getOptions={setOptions} getService={setService}></TTSPanel>
                            <Button className=' mt-6 w-full' size="lg" disabled={generating} onClick={generateAudio}>
                                {generating && <AiOutlineLoading3Quarters className='transition-colors ease-linear animate-spin' size={16} />}
                                <span>{t('tts.synthesis')}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}))

export default HomePage
