import './history.scss'
import { Button } from '@/app/components/ui/button';
import Tiptap from '@/app/components/business/tiptap';
import { useEffect, useState } from 'react';

import { secondsToHMS, getLocalFileUrl, getTextFragment } from '@/app/lib/utils';
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { PiVinylRecord } from "react-icons/pi";
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
import { TemoData } from '@/app/interface';
import { RiFileList3Line } from "react-icons/ri";
import { useTranslation } from 'react-i18next';

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
    const [speed, setSpeed] = useState<string>('1')
    const [target, setTarget] = useState<'original' | 'translate'>('original')
    const [jenerating, setJenerating] = useState(false)
    const [list, setList] = useState<any[]>([])
    const [editorRef, setEditorRef] = useState<Editor>();
    const [options, setOptions] = useState<TTSOptions>()
    const [curPlay, setCurPlay] = useState<any>();
    const [batchDownload, setBatchDownload] = useState<boolean>(false);
    let downloadList = [];
    const { t } = useTranslation()
    useEffect(() => {
        setList(dataStore?.temoData || [])
        if (curTemoId) return
        if (dataStore?.temoData.length) {
            setCurTemoId(id || dataStore.temoData[0].uuid)
            const curData = dataStore.temoData.find(item => item.uuid === id || item.uuid === dataStore.temoData[0].uuid)
            console.log(dataStore.temoData)
            if (curData) {
                setCurEditorData(curData.editorData)
                console.log(curData.editorData)
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

    const { toast } = useToast()

    const generateAudio = async () => {
        try {
            const result = await dataStore?.mergeTemo({ setJenerating, target, service, speed, uuid: curTemoId, editorData: editorRef?.getJSON() }, options)
            if (result) {
                result.duration = secondsToHMS(result.metadata?.duration)
                const index = list.findIndex(item => item.uuid === result.uuid)
                if (index > -1) {
                    list.splice(index, 1)
                    list.unshift(result)
                }
                setList(cloneDeep(list))
            }
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
                                    <div className={`flex flex-1 items-center space-x-3 rounded-md border flex-shrink-0 p-3 mb-3 ${curTemoId == item.uuid ? 'is-selected' : ''} ${item.fileUrl === curPlay?.fileUrl ? 'is-playing-audio' : ''}`}>
                                        <Button title={t('history.play')} variant={'ghost'} onClick={(e) => playAudio(item, false, e)} className={`p-0 cursor-pointer hover:bg-transparent flex-shrink-0 ${item.fileUrl === curPlay?.fileUrl ? 'animate-spin' : ''}`}>
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

                        <div className='flex-1 pl-4 pb-4 flex '>
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
                </div>}
            {!list.length && <div className='flex items-center justify-center h-full'>
                {t('tts.no results')}
            </div>}
            {curPlay?.fileUrl && <audio id="audioPlayer" controls>
                <source src={getLocalFileUrl(curPlay?.fileUrl)} type="audio/wav" />
            </audio>}
        </>
    )
}))

export default HistoryPage
