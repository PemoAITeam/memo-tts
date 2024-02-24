import './history.scss'
import { Button } from '@/components/ui/button';
import Tiptap from '@/components/business/tiptap';
import { useEffect, useState } from 'react';

import { secondsToHMS, getLocalFileUrl, getTextFragment } from '@/lib/utils';
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PiVinylRecord } from "react-icons/pi";
import { TbFileDownload } from "react-icons/tb";
import { GrCheckboxSelected } from "react-icons/gr";
import { Editor } from '@tiptap/react';
import { TTSOptions } from '@/lib/tts';
import { useToast } from "@/components/ui/use-toast"
import { ScrollArea } from '@/components/ui/scroll-area';
import { inject, observer } from 'mobx-react';
import SettingStore from '@/stores/settingStore';
import DataStore from '@/stores/dataStore';
import { useParams } from 'react-router-dom';
import AppStore from '@/stores/appStore';
import TTSPanel from '@/components/business/tts-panel';
import { cloneDeep } from 'lodash-es';
import { TbDownload } from "react-icons/tb";
import { HiOutlineTrash } from "react-icons/hi2";
import { TemoData } from '@/interface';

declare const window: any;

interface HomePageProps {
    settingStore?: SettingStore
    dataStore?: DataStore
    appStore?: AppStore
}

const HistoryPage = inject('settingStore', 'dataStore', 'appStore')(observer(({ settingStore, dataStore, appStore }: HomePageProps) => {

    const { hideBar } = appStore!
    const [service, setService] = useState<'Edge' | 'OpenAI' | 'Volcano'>('Edge')
    const { id } = useParams()
    const [curTemoId, setCurTemoId] = useState<string>('');
    const [curEditorData, setCurEditorData] = useState<any>()
    // const [url, setUrl] = useState('');
    // const [valid, setValid] = useState(false);
    // const [parsing, setParsing] = useState(false);
    const [speed, setSpeed] = useState<string>('1')
    const [target, setTarget] = useState<'original' | 'translate'>('original')
    const [jenerating, setJenerating] = useState(false)
    const [list, setList] = useState<any[]>([])
    const [editorRef, setEditorRef] = useState<Editor>();
    const [options, setOptions] = useState<TTSOptions>()
    const [curPlay, setCurPlay] = useState<any>();
    const [batchDownload, setBatchDownload] = useState<boolean>(false);
    // const [curVoice, setCurVoice] = useState<any>()
    let downloadList = [];
    console.log(id)
    useEffect(() => {
        setList(dataStore?.temoData || [])
        if(curTemoId) return
        if (dataStore?.temoData.length) {
            setCurTemoId(id || dataStore.temoData[0].uuid)
            const curData = dataStore.temoData.find(item => item.uuid === id || item.uuid === dataStore.temoData[0].uuid)
            console.log(dataStore.temoData)
            if (curData) {
                setCurEditorData(curData.editorData)
                console.log(curData.editorData)
            }
        }
        return () => {
            setList([])
            setCurEditorData("")
        }

    }, [dataStore?.temoData, settingStore, id, curTemoId]);

    useEffect(() => {
        if (id) {
            setCurTemoId(id)
        }

        return () => {
            setCurTemoId("")
        }
    }, [id])

    const { toast } = useToast()

    const generateAudio = async () => {
        try {
            const editorData = editorRef?.getJSON().content;
            if (editorData?.length) {
                editorData.forEach((item, index) => {
                    if (item.type == 'editorCard' && editorData[index + 1]?.type == 'translateCard') {
                        if (item.attrs?.voice) {
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
            const result = await dataStore?.mergeTemo({ service, speed, jsonData, uuid: curTemoId, editorData: editorRef?.getJSON() }, options)
            if (result) {
                result.duration = secondsToHMS(result.metadata?.duration)
                const index = list.findIndex(item => item.uuid === result.uuid)
                if (index > -1) {
                    list.splice(index, 1)
                    list.unshift(result)
                }
                setList(cloneDeep(list))
            }
            console.log(result)
            setJenerating(false);
        } catch (error) {
            setJenerating(false);
            console.log(error)
        }
    }

    let audioPlayer: HTMLAudioElement | null;
    const playAudio = (item: any, isAudition?: boolean, event?: any) => {
        if (event) {
            event.stopPropagation();
        }
        if (curPlay?.fileUrl === item.fileUrl && !isAudition) {
            handleEnded()
        } else {
            if (audioPlayer) {
                audioPlayer.pause()
                audioPlayer?.removeEventListener('ended', handleEnded);
            }
            setCurPlay(item);
            setTimeout(() => {
                audioPlayer = document.getElementById('audioPlayer') as HTMLAudioElement;
                audioPlayer.load();
                audioPlayer.play();
                if (!isAudition) {
                    audioPlayer.addEventListener('ended', handleEnded);
                }
            })
        }
    }

    const handleEnded = () => {
        console.log('Audio playback stopped');
        // 在这里执行播放结束后的逻辑
        // 移除事件监听器
        audioPlayer?.removeEventListener('ended', handleEnded);
        setCurPlay(null)
        audioPlayer = null;
    };

    const download = async (event: any, data: any) => {
        if (event) {
            event.stopPropagation();
        }
        const srtData = getTextFragment(data.infoData)
        console.log(srtData)
        showSaveDialog(data.title, [{ ...data, srtData }])
    }

    const downloadBatch = async () => {
        downloadList = list.filter(item => item.selected);
        if (!downloadList.length) {
            toast({
                variant: "destructive",
                description: `请先选择要下载的文件`
            })
            return;
        }
        downloadList = downloadList.map(item => ({
            ...item,
            srtData: getTextFragment(item.infoData)
        }));
        const result = await showSaveDialog('temo_audios', downloadList)
        if (result === 'Successful') {
            cancelDownloadBatch()
        }
    }

    const showSaveDialog = async (title: string, data: any[]) => {
        const file: any = await window.AIM.openDialog('showSaveDialog', {
            defaultPath: `${title}.zip`,
            filters: [
                {
                    name: '',
                    extensions: ['zip']
                }
            ],
            properties: []
        })
        if (!file?.canceled) {
            const result = await window.AIM.temoDownload(cloneDeep(data), file.filePath);
            if (result === 'Successful') {
                toast({
                    description: `保存成功`
                })
            } else {
                toast({
                    variant: "destructive",
                    description: `保存失败，请重试`
                })
            }
            return result;
        }
    }

    const selectDownload = (data: any) => {
        if (batchDownload) {
            const updatedData = list.map(item =>
                item.fileUrl === data.fileUrl ? { ...item, selected: !data.selected } : item
            );
            setList(updatedData)
        } else {
            setCurEditorData(data.editorData);
            setCurTemoId(data.uuid)
        }
    }

    const cancelDownloadBatch = () => {
        const updatedData = list.map(item => ({ ...item, selected: false }));
        setBatchDownload(false)
        setList(updatedData)
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

    const deleteItem = async (event: any, data: TemoData) => {
        if (event) {
            event.stopPropagation();
        }
        if(data.uuid === curTemoId) {
            setCurTemoId("")
            setCurEditorData("")
        }
        dataStore?.setTrashData([data])
    }

    return (
        <>
            {!!list.length &&
                <div className="flex flex-col h-full">

                    <div className='flex flex-1 temo-draggable temo-content'>
                        <div className='pl-4'>
                            <div className={`flex items-center justify-between h-12 p-4  ${hideBar && window.AIM.isMac ? ' ml-12' : ''}`}>
                                {list.length > 1 && <Button variant={'ghost'} className=" temo-no-draggable flex items-center relative p-0 cursor-pointer bg-transparent shadow-none h-auto hover:bg-transparent mr-4" onClick={() => setBatchDownload(true)}>
                                    <TbFileDownload size={18} />
                                    <span className=" text-sm ml-1">批量下载</span>
                                </Button>}
                                {batchDownload && <div className='mb-1 temo-no-draggable'>
                                    <Button variant='ghost' className='text-sm mr-2 hover:bg-transparent w-8 h-8 rounded-full transition-colors ease-linear' onClick={cancelDownloadBatch}>取消</Button>
                                    <Button variant='ghost' className='text-sm hover:bg-transparent w-8 h-8 rounded-full transition-colors ease-linear' onClick={downloadBatch}>完成</Button>
                                </div>}
                            </div>
                            <ScrollArea className='list-scroll-area pr-3 temo-no-draggable'> {list.map(item => (
                                <div key={item.fileUrl} className='relative' onClick={() => selectDownload(item)}>
                                    {batchDownload && !item.selected && <span className='absolute w-3 h-3 border right-2 top-1'></span>}
                                    {batchDownload && item.selected && <span className='absolute w-3 h-3 right-2 top-1'><GrCheckboxSelected size={12} /></span>}
                                    <div className={`flex flex-1 items-center space-x-3 rounded-md border p-3 mb-3 ${curTemoId == item.uuid ? 'is-selected' : ''} ${item.fileUrl === curPlay?.fileUrl ? 'is-playing-audio' : ''}`}>
                                        <Button title='播放' variant={'ghost'} onClick={(e) => playAudio(item, false, e)} className={`p-0 cursor-pointer hover:bg-transparent flex-shrink-0 ${item.fileUrl === curPlay?.fileUrl ? 'animate-spin' : ''}`}>
                                            <PiVinylRecord size={36} />
                                        </Button>
                                        <div className="flex-1 space-y-1">
                                            <p className="font-medium cursor-default">
                                                {item.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                <span className=' mr-2'>{item.voiceLocalName}</span>
                                                <span>{item.duration}</span>
                                            </p>
                                        </div>
                                        <Button title='下载' variant={'ghost'} className='flex-shrink-0 p-0 cursor-pointer bg-transparent shadow-none h-auto hover:bg-transparent text-sm' onClick={(e) => download(e, item)}>
                                            <TbDownload size={18} />
                                        </Button>
                                        <Button title='删除' variant={'ghost'} className='flex-shrink-0 p-0 cursor-pointer bg-transparent shadow-none h-auto hover:bg-transparent text-sm' onClick={(e) => deleteItem(e, item)}>
                                            <HiOutlineTrash size={18} />
                                        </Button>
                                        {/* <Button variant={'ghost'} className='flex-shrink-0 p-0 cursor-pointer bg-transparent shadow-none h-auto hover:bg-transparent text-sm mr-1' onClick={(e) => playAudio(item, false, e)}>{item.fileUrl === curPlay?.fileUrl ? <AiOutlinePauseCircle size={18} /> : <GoPlay size={18} />}</Button> */}
                                    </div>
                                </div>
                            )
                            )}</ScrollArea>
                        </div>

                        <div className='flex-1 pl-4 pb-4 flex mt-12'>
                            <div className='flex temo-no-draggable  flex-col flex-1 border h-full p-3 pr-0 rounded-md'>
                                <Tiptap content={curEditorData} setEditor={setEditorRef} />
                            </div>
                            <div className='temo-no-draggable px-4 flex-shrink-0 tts-service-panel'>
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
                </div>}
            {!list.length && <div className='flex items-center justify-center h-full'>
                暂无内容
            </div>}
            {curPlay?.fileUrl && <audio id="audioPlayer" controls>
                <source src={getLocalFileUrl(curPlay?.fileUrl)} type="audio/wav" />
            </audio>}
        </>
    )
}))

export default HistoryPage
