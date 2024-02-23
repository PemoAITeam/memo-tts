import './home.scss'
import { Button } from '@/components/ui/button';
import Tiptap from '@/components/business/tiptap';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
// import EdgeConfig from '@/components/business/edge-config';
// import OpenAIConfig from '@/components/business/openAI-config';
// import VolcanoConfig from '@/components/business/volcano-config';

import { secondsToHMS, generateUUID } from '@/lib/utils';
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import mammoth from "mammoth";
import { Editor } from '@tiptap/react';
import { TTSOptions } from '@/lib/tts';
import { useToast } from "@/components/ui/use-toast"
// import { remark } from 'remark';
// import strip from 'strip-markdown'
import { inject, observer } from 'mobx-react';
import SettingStore from '@/stores/settingStore';
import DataStore from '@/stores/dataStore';
import { useNavigate } from 'react-router-dom';
import AppStore from '@/stores/appStore';
import TTSPanel from '@/components/business/tts-panel';

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

    const { toast } = useToast()

    const generateAudio = async () => {
        try {
            const editorData = editorRef?.getJSON().content;
            if(editorData?.length) {
                editorData.forEach((item, index) => {
                    if(item.type == 'editorCard' && editorData[index + 1]?.type == 'translateCard' ) {
                        if(item.attrs?.voice) {
                            editorData[index + 1].attrs!.voice = item.attrs.voice
                        } else {
                            delete editorData[index + 1].attrs!.voice
                        }
                    }
                })
            }
            console.log(editorData)
            const jsonData = target === 'original' ? editorData?.filter(item => !!item.content?.length && item.content[0].text && item.type === 'editorCard')
                : editorData?.filter(item => !!item.content?.length && item.content[0].text && item.type === 'translateCard')
            console.log(jsonData)
            if (!jsonData?.length) {
                toast({
                    variant: "destructive",
                    description: `请先在左侧输入框编辑文字...`
                })
                return
            }
            setJenerating(true)
            const result = await dataStore?.mergeTemo({service,speed, jsonData, uuid:generateUUID(), editorData: editorRef?.getJSON()}, options)
            if (result) {
                result.duration = secondsToHMS(result.metadata?.duration)
                dataStore?.setTemoData(result)
                appStore?.setTemoId("history")
                editorRef?.commands.clearContent();
                editorRef?.chain().insertContentAt(editorRef.state.selection.head, { type: 'editorCard' }).focus().run()
                dataStore?.setEditorData("")
                navigate(`/history/${result.uuid}`)
            }
            console.log(result)
            setJenerating(false);
        } catch (error) {
            setJenerating(false);
            console.log(error)
        }
    }

    // const handleDrop = (event: any) => {
    //     event.preventDefault();
    //     const file = event.dataTransfer.files[0];
    //     const reader = new FileReader();
    //     console.log(file)
    //     if (file.type === 'text/plain') {
    //         reader.readAsText(file);
    //         reader.onload = e => { // 读取完毕从中取值
    //             const text = e.target?.result as string;
    //             editorRef?.chain().insertContentAt(editorRef.state.selection.head, text).focus().run()
    //             console.log('pointsTxt', text) // 获取到的TXT文件
    //         };
    //     } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
    //         reader.onloadend = function () {
    //             const arrayBuffer = reader.result as ArrayBuffer;
    //             if (arrayBuffer) {
    //                 mammoth.extractRawText({ arrayBuffer: arrayBuffer }).then(function (resultObject) {
    //                     editorRef?.chain().insertContentAt(editorRef.state.selection.head, resultObject.value).focus().run()
    //                 })
    //             }

    //         };
    //         reader.readAsArrayBuffer(file);
    //     } else {
    //         const type = file.name.split('.').pop();
    //         if (type === 'md') {
    //             reader.onload = e => {
    //                 const markdownText = e.target?.result as string;
    //                 // 使用 remark 解析 Markdown
    //                 remark()
    //                     .use(strip) // 使用 strip 插件去除 Markdown 格式
    //                     .process(markdownText, (err, file) => {
    //                         if (err) throw err;

    //                         // 提取的纯文本
    //                         const text = file?.toString();
    //                         if (text) {
    //                             editorRef?.chain().insertContentAt(editorRef.state.selection.head, text).focus().run()
    //                         }
    //                         console.log(text);
    //                     });
    //             };
    //             reader.readAsText(file); // 以文本格式读取文件
    //         } else {
    //             toast({
    //                 variant: "destructive",
    //                 description: `当前只支持解析txt、docx、md文档`
    //             })
    //         }
    //     }
    // };

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
                                                其他设置
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mb-1 text-sm">语速</div>
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
                                    <div className="mb-1 text-sm mt-4">文本</div>
                                    <Tabs value={target}>
                                        <TabsList className="grid grid-cols-2">
                                            <TabsTrigger className='px-1' value="original" onClick={() => setTarget('original')}>原文</TabsTrigger>
                                            <TabsTrigger className='px-1' value="translate" onClick={() => setTarget('translate')}>译文</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </>
                            }
                            <Button className=' mt-6 w-full' size="lg" disabled={jenerating} onClick={generateAudio}>
                                {jenerating && <AiOutlineLoading3Quarters className='transition-colors ease-linear animate-spin mr-2' size={16} />}
                                <span>合成</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}))

export default HomePage
