import './home.scss'
import { Button } from '@/components/ui/button';
import Tiptap from '@/components/business/tiptap';
import { useEffect, useState } from 'react';

import { secondsToHMS, generateUUID } from '@/lib/utils';
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Editor } from '@tiptap/react';
import { TTSOptions } from '@/lib/tts';
import { inject, observer } from 'mobx-react';
import SettingStore from '@/stores/settingStore';
import DataStore from '@/stores/dataStore';
import { useNavigate } from 'react-router-dom';
import AppStore from '@/stores/appStore';
import TTSPanel from '@/components/business/tts-panel';
import { useTranslation } from 'react-i18next';

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
    const [jenerating, setJenerating] = useState(false)
    const [editorRef, setEditorRef] = useState<Editor>();
    const [options, setOptions] = useState<TTSOptions>()
    const navigate = useNavigate()
    const { t } = useTranslation()
    useEffect(() => {
        if (dataStore?.editorData) {
            setCurEditorData(dataStore.editorData)
        }
        return () => {
            setCurEditorData("")
        }

    }, []);

    useEffect(() => {
        // 设置定时器，每隔一段时间保存一次内容
        const saveIntervalId = setInterval(async () => {
            // 模拟保存内容到存储的操作
            const data = editorRef?.getJSON()
            if (data) {
                dataStore?.setEditorData(data)
            }
        }, 1000);

        // 在组件卸载时清除定时器
        return () => {
            clearInterval(saveIntervalId);
        }
    }, [editorRef, dataStore])

    const generateAudio = async () => {
        try {
            const result = await dataStore?.mergeTemo({ setJenerating, target, service,speed, uuid:generateUUID(), editorData: editorRef?.getJSON()}, options)
            if (result) {
                result.duration = secondsToHMS(result.metadata?.duration)
                dataStore?.setTemoData(result)
                appStore?.setTemoId("history")
                editorRef?.commands.clearContent();
                editorRef?.chain().insertContentAt(editorRef.state.selection.head, { type: 'editorCard' }).focus().run()
                dataStore?.setEditorData("")
                navigate(`/history/${result.uuid}`)
            }
        } catch (error) {
            setJenerating(false);
            console.log(error)
        }
    }

    return (
        <>
            <div className="flex flex-col h-full">
                <div className='flex flex-1 temo-draggable pt-12 overflow-hidden'>
                    <div className='flex-1 pl-4 pb-4 flex temo-no-draggable'>
                        <div className='flex  flex-col flex-1 border h-full p-3 pr-0 rounded-md'>
                            <Tiptap content={curEditorData} setEditor={setEditorRef} />
                        </div>
                        <div className='px-4 flex-shrink-0 tts-service-panel'>
                            <TTSPanel speed={speed} setOptions={setOptions} getService={setService}></TTSPanel>
                            {
                                service !== 'Volcano' &&
                                <>
                                    <div className="relative mt-8 mb-2">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t" />
                                        </div>
                                        <div className="relative flex text-xs uppercase">
                                            <span className="bg-background px-2 text-muted-foreground">
                                                {t('tts.other setting')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mb-1 text-sm">{t('tts.speed')}</div>
                                    <Tabs value={speed}>
                                        <TabsList className="grid w-full grid-cols-7">
                                            <TabsTrigger className='px-1' value="0.5" onClick={() => setSpeed('0.5')}>0.5</TabsTrigger>
                                            <TabsTrigger className='px-1' value="0.75" onClick={() => setSpeed('0.75')}>0.75</TabsTrigger>
                                            <TabsTrigger className='px-1' value="1" onClick={() => setSpeed('1')}>1</TabsTrigger>
                                            <TabsTrigger className='px-1' value="1.5" onClick={() => setSpeed('1.5')}>1.5</TabsTrigger>
                                            <TabsTrigger className='px-1' value="2" onClick={() => setSpeed('2')}>2</TabsTrigger>
                                            <TabsTrigger className='px-1' value="3" onClick={() => setSpeed('3')}>3</TabsTrigger>
                                            <TabsTrigger className='px-1' value="4" onClick={() => setSpeed('4')}>4</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    <div className="mb-1 text-sm mt-4">{t('tts.text')}</div>
                                    <Tabs value={target}>
                                        <TabsList className="grid grid-cols-2">
                                            <TabsTrigger className='px-1' value="original" onClick={() => setTarget('original')}>{t('tts.original text')}</TabsTrigger>
                                            <TabsTrigger className='px-1' value="translate" onClick={() => setTarget('translate')}>{t('tts.translate text')}</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </>
                            }
                            <Button className=' mt-6 w-full' size="lg" disabled={jenerating} onClick={generateAudio}>
                                {jenerating && <AiOutlineLoading3Quarters className='transition-colors ease-linear animate-spin mr-2' size={16} />}
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
