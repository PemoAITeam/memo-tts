/* eslint-disable no-case-declarations */
import './history.scss'
import { Button } from '@/app/components/ui/button';
import Tiptap from '@/app/components/business/tiptap';
import { useCallback, useEffect, useState } from 'react';

import { secondsToHMS, getTextFragment } from '@/app/lib/utils';
import { AiOutlineLoading3Quarters } from "react-icons/ai";
// import { PiVinylRecord } from "react-icons/pi";
import { GrCheckboxSelected } from "react-icons/gr";
import { Editor } from '@tiptap/react';
import { TTSOptions } from '@/app/lib/tts';
import { useToast } from "@/app/components/ui/use-toast"
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { inject, observer } from 'mobx-react';
import SettingStore from '@/app/stores/settingStore';
import DataStore from '@/app/stores/dataStore';
import { useParams } from 'react-router-dom';
import AppStore from '@/app/stores/appStore';
import TTSPanel from '@/app/components/business/tts-panel';
import { cloneDeep } from 'lodash-es';
import { TbDownload } from "react-icons/tb";
import { HiOutlineTrash } from "react-icons/hi2";
import { BgmData, TemoData } from '@/app/interface';
import { RiFileList3Line } from "react-icons/ri";
import { useTranslation } from 'react-i18next';
import { Remotion } from '@/app/components/business/remotion';

declare const window: any;

interface HomePageProps {
    settingStore?: SettingStore
    dataStore?: DataStore
    appStore?: AppStore
}

const HistoryPage = inject('settingStore', 'dataStore', 'appStore')(observer(({ settingStore, dataStore }: HomePageProps) => {

    const [service, setService] = useState<'Edge' | 'OpenAI' | 'Volcano'>('Edge')
    const { id } = useParams()
    const [curTemoId, setCurTemoId] = useState<string>('');
    const [curEditorData, setCurEditorData] = useState<any>()
    const [currentFile, setCurrentFile] = useState<TemoData | null>();
    const [bgm, setBgm] = useState<BgmData>();
    const [speed, setSpeed] = useState<string>('1')
    const [target, setTarget] = useState<'original' | 'translate'>('original')
    const [jenerating, setJenerating] = useState(false)
    const [list, setList] = useState<any[]>([])
    const [editorRef, setEditorRef] = useState<Editor>();
    const [options, setOptions] = useState<TTSOptions>()
    // const [curPlay, setCurPlay] = useState<any>();
    const [batchDownload, setBatchDownload] = useState<boolean>(false);
    let downloadList = [];
    const { t } = useTranslation()
    const { toast } = useToast()

    useEffect(() => {
        setList(dataStore?.temoData || [])
        if (curTemoId) return
        if (dataStore?.temoData.length) {
            setCurTemoId(id || dataStore.temoData[0].uuid)
            const curData = dataStore.temoData.find(item => item.uuid === id || item.uuid === dataStore.temoData[0].uuid)
            if (curData) {
                setCurrentFile(curData)
                setCurEditorData(curData.editorData)
                console.log(curData)
                setBgm(curData.bgm)
            }
        }

    }, [dataStore?.temoData, settingStore, id, curTemoId]);

    useEffect(() => {
        if (id) {
            setCurTemoId(id)
        }

        return () => {
            setCurTemoId("")
            setList([])
            setCurEditorData("")
        }
    }, [id])

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
                        description: t('tts.synthesis fail')
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
            const result = await dataStore?.mergeTemo({ setJenerating, target, service, speed, uuid: curTemoId, bgm, editorData: editorRef?.getJSON() }, options)
            if (result) {
                result.duration = secondsToHMS(result.metadata?.duration)
                const index = list.findIndex(item => item.uuid === result.uuid)
                if (index > -1) {
                    list.splice(index, 1)
                    list.unshift(result)
                }
                setList(cloneDeep(list))
                setCurrentFile(result)
            }
        } catch (error) {
            setJenerating(false);
            console.log(error)
        }
    }

    // let audioPlayer: HTMLAudioElement | null;
    // const playAudio = (item: any, isAudition?: boolean, event?: any) => {
    //     if (event) {
    //         event.stopPropagation();
    //     }
    //     if (curPlay?.fileUrl === item.fileUrl && !isAudition) {
    //         handleEnded()
    //     } else {
    //         if (audioPlayer) {
    //             audioPlayer.pause()
    //             audioPlayer?.removeEventListener('ended', handleEnded);
    //         }
    //         setCurPlay(item);
    //         setTimeout(() => {
    //             audioPlayer = document.getElementById('audioPlayer') as HTMLAudioElement;
    //             audioPlayer.load();
    //             audioPlayer.play();
    //             if (!isAudition) {
    //                 audioPlayer.addEventListener('ended', handleEnded);
    //             }
    //         })
    //     }
    // }

    // const handleEnded = () => {
    //     console.log('Audio playback stopped');
    //     // 在这里执行播放结束后的逻辑
    //     // 移除事件监听器
    //     audioPlayer?.removeEventListener('ended', handleEnded);
    //     setCurPlay(null)
    //     audioPlayer = null;
    // };

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
                description: t('history.download file')
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
                    description: t('history.save success')
                })
            } else {
                toast({
                    variant: "destructive",
                    description: t('history.save fail')
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
            setCurrentFile(data)
            setCurTemoId(data.uuid)
        }
    }

    const selectBatch = () => {
        if (batchDownload) {
            cancelDownloadBatch()
        } else {
            setBatchDownload(true)
        }
    }

    const cancelDownloadBatch = () => {
        const updatedData = list.map(item => ({ ...item, selected: false }));
        setBatchDownload(false)
        setList(updatedData)
    }

    const deleteItem = async (event: any, data?: TemoData) => {
        if (event) {
            event.stopPropagation();
        }
        let items: any = [];
        if (data) {
            if (data.uuid === curTemoId) {
                setCurTemoId("")
                setCurEditorData("")
            }
            items.push(data)
        } else {
            items = list.filter(item => item.selected);
            if (!items.length) {
                toast({
                    variant: "destructive",
                    description: t('history.delete file')
                })
                return;
            }
        }
        console.log(items)
        dataStore?.setTrashData(items)
    }

    return (
        <>
            {!!list.length &&
                <div className="flex flex-col h-full">
                    <div className='flex flex-1 temo-draggable temo-content pt-12'>

                        <div className='pl-4'>
                            <ScrollArea className='list-scroll-area pr-3 temo-no-draggable'> {list.map(item => (
                                <div key={item.fileUrl} className='relative' onClick={() => selectDownload(item)}>
                                    {batchDownload && !item.selected && <span className='absolute w-3 h-3 border right-2 top-1'></span>}
                                    {batchDownload && item.selected && <span className='absolute w-3 h-3 right-2 top-1'><GrCheckboxSelected size={12} /></span>}
                                    <div className={`flex flex-1 items-center space-x-3 rounded-md border flex-shrink-0 p-3 mb-3 ${curTemoId == item.uuid ? 'is-selected' : ''}`}>
                                        {/* <Button title={t('history.play')} variant={'ghost'} className={`p-0 cursor-pointer hover:bg-transparent flex-shrink-0 ${item.fileUrl === curPlay?.fileUrl ? 'animate-spin' : ''}`}>
                                            <PiVinylRecord size={36} />
                                        </Button> */}
                                        <div className="flex-1 space-y-1">
                                            <p className="font-medium cursor-default">
                                                {item.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                <span className=' mr-2'>{item.voiceLocalName}</span>
                                                <span>{item.duration}</span>
                                            </p>
                                        </div>
                                        <Button title={t('history.download')} variant={'ghost'} className='flex-shrink-0 p-0 cursor-pointer bg-transparent shadow-none h-auto hover:bg-transparent text-sm' onClick={(e) => download(e, item)}>
                                            <TbDownload size={18} />
                                        </Button>
                                        <Button title={t('history.delete')} variant={'ghost'} className='flex-shrink-0 p-0 cursor-pointer bg-transparent shadow-none h-auto hover:bg-transparent text-sm' onClick={(e) => deleteItem(e, item)}>
                                            <HiOutlineTrash size={18} />
                                        </Button>
                                        {/* <Button variant={'ghost'} className='flex-shrink-0 p-0 cursor-pointer bg-transparent shadow-none h-auto hover:bg-transparent text-sm mr-1' onClick={(e) => playAudio(item, false, e)}>{item.fileUrl === curPlay?.fileUrl ? <AiOutlinePauseCircle size={18} /> : <GoPlay size={18} />}</Button> */}
                                    </div>
                                </div>
                            )
                            )}</ScrollArea>
                            <div className={`flex items-center justify-between h-12 p-4`}>
                                {list.length > 1 && <Button variant={'ghost'} className=" temo-no-draggable flex items-center relative p-0 cursor-pointer bg-transparent shadow-none h-auto hover:bg-transparent mr-4" onClick={() => selectBatch()}>
                                    <RiFileList3Line size={18} />
                                    <span className=" text-sm ml-1">{t('history.batch actions')}</span>
                                </Button>}
                                {batchDownload && <div className='mb-1 temo-no-draggable'>
                                    <Button variant='ghost' className='text-sm mr-2 hover:bg-transparent w-8 h-8 rounded-full transition-colors ease-linear' onClick={downloadBatch}>
                                        {t('history.download')}
                                    </Button>
                                    <Button variant='ghost' className='text-sm hover:bg-transparent w-8 h-8 rounded-full transition-colors ease-linear' onClick={(e) => deleteItem(e)}>
                                        {t('history.delete')}
                                    </Button>
                                </div>}
                            </div>
                        </div>
                        {!!currentFile && <div className=' flex-shrink-0 tts-remotion-history mt-3 mb-3 mr-3'>
                            <div>{currentFile.title}</div>
                            <Remotion temoData={currentFile}></Remotion>
                        </div>}
                        <div className='flex-1 pl-4 pb-4 flex '>
                            <div className='flex temo-no-draggable  flex-col flex-1 border h-full p-3 pr-0 rounded-md'>
                                <Tiptap content={curEditorData} setEditor={setEditorRef} type={currentFile?.type} bgmData={currentFile?.bgm} getBgm={setBgm} />
                            </div>
                            <div className='temo-no-draggable px-4 flex-shrink-0 tts-service-panel'>
                                <TTSPanel getTarget={setTarget} getSpeed={setSpeed} setOptions={setOptions} getService={setService}></TTSPanel>
                                <Button className=' mt-6 w-full' size="lg" disabled={jenerating} onClick={generateAudio}>
                                    {jenerating && <AiOutlineLoading3Quarters className='transition-colors ease-linear animate-spin mr-2' size={16} />}
                                    <span>{t('tts.synthesis')}</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>}
            {!list.length && <div className='flex items-center justify-center h-full'>
                {t('tts.no results')}
            </div>}
            {/* {curPlay?.fileUrl && <audio ref={audioRef} controls></audio>} */}
        </>
    )
}))

export default HistoryPage
