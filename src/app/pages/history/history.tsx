/* eslint-disable no-case-declarations */
import './history.scss'
import { Button } from '@/app/components/ui/button';
import Tiptap from '@/app/components/business/tiptap';
import { useCallback, useEffect, useState } from 'react';

import { getTextFragment, updateTemoData } from '@/app/lib/utils';
// import { AiOutlineLoading3Quarters } from "react-icons/ai";
// import { PiVinylRecord } from "react-icons/pi";
import { GrCheckboxSelected } from "react-icons/gr";
// import { Editor } from '@tiptap/react';
// import { TTSOptions } from '@/app/lib/tts';
import { useToast } from "@/app/components/ui/use-toast"
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { inject, observer } from 'mobx-react';
import SettingStore from '@/app/stores/settingStore';
import DataStore from '@/app/stores/dataStore';
import { useParams } from 'react-router-dom';
import AppStore from '@/app/stores/appStore';
// import TTSPanel from '@/app/components/business/tts-panel';
import { cloneDeep } from 'lodash-es';
import { TbDownload } from "react-icons/tb";
import { HiOutlineTrash } from "react-icons/hi2";
import { TemoData, TemoFileList } from '@/app/interface';
// import { RiFileList3Line } from "react-icons/ri";
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import CircularProgressBar from '@/app/components/business/progress';
import { getLocalFileUrl } from '@/app/lib/utils';

declare const window: any;

interface HomePageProps {
    settingStore?: SettingStore
    dataStore?: DataStore
    appStore?: AppStore
}

const HistoryPage = inject('settingStore', 'dataStore', 'appStore')(observer(({ dataStore }: HomePageProps) => {
    const { id } = useParams()
    const { temoData = [] } = dataStore!
    const [curTemoId, setCurTemoId] = useState<string>('');
    const [curEditorData, setCurEditorData] = useState<any>()
    const [currentFile, setCurrentFile] = useState<TemoData>();
    const [list, setList] = useState<any[]>([])
    const [batchDownload] = useState<boolean>(false);
    const [isDownload, setIsDownload] = useState<boolean>(false);
    const [downloadProgress, setDownloadProgress] = useState<number>(0);
    const { t } = useTranslation()
    const { toast } = useToast()
    // const [player, setPlayer] = useState<PlayerRef>()

    useEffect(() => {
        setList(temoData)
        if (id) {
            setCurTemoId(id)
        } else if (temoData.length) {
            setCurTemoId(temoData[0].uuid)
        }
        return () => {
            setCurTemoId("")
            setList([])
            setCurEditorData("")
        }
    }, [temoData, id])

    useEffect(() => {
        const curData = temoData.find(item => item.uuid === curTemoId)
        if (curData) {
            const data = updateTemoData(curData)
            setCurrentFile(data)
            setCurEditorData(curData.editorData)
        }
    }, [curTemoId, temoData])


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
            case 'tts:media:progress':
                if (messageData.data.progress * 100 > 1) {
                    setDownloadProgress(messageData.data.progress)
                }
                break;
            case 'tts:media:done':
                setIsDownload(false)
                setDownloadProgress(0)
                toast({
                    description: t('history.save success')
                })
                break;
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

    const download = async (event: any, data: TemoData) => {
        if (event) {
            event.stopPropagation();
        }
        if (data.type === 'video') {
            showSaveVideoDialog(data.title, [{ ...data }])
        } else {
            const srtData = getTextFragment(data.infoData)
            console.log(srtData)
            showSaveAudioDialog(data.title, [{ ...data, srtData }])
        }
    }

    const showSaveVideoDialog = async (title: string, data: any[]) => {
        const file: any = await window.AIM.openDialog('showSaveDialog', {
            defaultPath: `${title}.mp4`,
            filters: [
                {
                    name: '',
                    extensions: ['mp4']
                }
            ],
            properties: []
        })
        if (!file?.canceled) {
            const curFile = data[0]
            let from = 0;
            const list: TemoFileList[] = curFile.fileList?.map((file: any) => {
                const newObj = {
                    ...file,
                    from,
                    duration: Math.ceil(file.metadata.duration)
                }
                from += Math.ceil(file.metadata.duration)
                return newObj
            })
            const params: any = {
                type: curFile.type!,
                // Audio settings
                audioOffsetInSeconds: 0,
                bgm: curFile.bgm || '',
                audioFileName: 'temo_audio.mp3',
                onlyDisplayCurrentSentence: true,
                subtitlesTextColor: 'rgba(255, 255, 255, 0.93)',
                subtitlesLinePerPage: 4,
                subtitlesZoomMeasurerSize: 10,
                subtitlesLineHeight: 64,
                fileList: list!,
                metadata: curFile.metadata,
                duration: Math.ceil(curFile.metadata?.duration)
            }

            const copyFiles = [curFile.fileUrl];
            if (params.bgm) {
                copyFiles.push(params.bgm.path)
            }
            if (params.fileList?.length) {
                params.fileList.forEach((file: TemoFileList) => {
                    if (file.pic) {
                        copyFiles.push(file.pic.path)
                    }
                })
            }
            params.copyFiles = copyFiles
            console.log(params)
            setIsDownload(true)
            setDownloadProgress(0.01)
            await window.AIM.tts.renderMedia(cloneDeep(params), file.filePath)
            setIsDownload(false)
        }
    }

    const showSaveAudioDialog = async (title: string, data: any[]) => {
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
            const result = await window.AIM.tts.temoDownload(cloneDeep(data), file.filePath);
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
            setIsDownload(false)
            return result;
        }
    }

    const selectItem = (data: any) => {
        if (batchDownload) {
            const updatedData = list.map(item =>
                item.fileUrl === data.fileUrl ? { ...item, selected: !data.selected } : item
            );
            setList(updatedData)
        } else {
            // setCurEditorData(data.editorData);
            // setCurrentFile(data)
            setCurTemoId(data.uuid)
        }
    }

    // const downloadBatch = async () => {
    //     downloadList = list.filter(item => item.selected);
    //     if (!downloadList.length) {
    //         toast({
    //             variant: "destructive",
    //             description: t('history.download file')
    //         })
    //         return;
    //     }
    //     downloadList = downloadList.map(item => ({
    //         ...item,
    //         srtData: getTextFragment(item.infoData)
    //     }));
    //     const result = await showSaveDialog('temo_audios', downloadList)
    //     if (result === 'Successful') {
    //         cancelDownloadBatch()
    //     }
    // }

    // const selectBatch = () => {
    //     if (batchDownload) {
    //         cancelDownloadBatch()
    //     } else {
    //         setBatchDownload(true)
    //     }
    // }

    // const cancelDownloadBatch = () => {
    //     const updatedData = list.map(item => ({ ...item, selected: false }));
    //     setBatchDownload(false)
    //     setList(updatedData)
    // }

    const deleteItem = async (event: any, data?: TemoData) => {
        if (event) {
            event.stopPropagation();
        }
        let items: any = [];
        if (data) {
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
        dataStore?.setTrashData(items)
        setList(temoData || [])
        if (data?.uuid === curTemoId && temoData.length) {
            setCurTemoId(temoData[0].uuid)
        }
    }

    const generateAudio = (result: TemoData) => {
        const index = list.findIndex(item => item.uuid === result.uuid)
        if (index > -1) {
            list.splice(index, 1)
            list.unshift(result)
        }
        setList(cloneDeep(list))
        setCurrentFile(result)
    }

    console.log(currentFile);

    return (
        <>
            {!!temoData.length &&
                <div className="flex flex-col h-full">
                    <div className='flex flex-1 temo-draggable temo-content pt-4'>

                        <div className='pl-4 flex flex-col temo-list flex-shrink-0'>
                            <div className='temo-no-draggable list-scroll-area'>
                                {!!list.length &&
                                    <ScrollArea className='pr-3'> {list.map(item => (
                                        <div key={item.fileUrl} className='relative cursor-pointer' onClick={() => selectItem(item)}>
                                            {batchDownload && !item.selected && <span className='absolute w-3 h-3 border right-2 top-1'></span>}
                                            {batchDownload && item.selected && <span className='absolute w-3 h-3 right-2 top-1'><GrCheckboxSelected size={12} /></span>}
                                            <div className={`flex flex-1 items-center space-x-3 rounded-md border flex-shrink-0 p-3 mb-3 ${curTemoId == item.uuid ? 'is-selected' : ''}`}>
                                                <div className="flex-1 space-y-1">
                                                    <p className="font-medium">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        <span className=' mr-2'>{item.voiceLocalName}</span>
                                                        <span>{item.duration}</span>
                                                    </p>
                                                </div>
                                                {(isDownload && curTemoId === item.uuid) ? <CircularProgressBar progress={downloadProgress}></CircularProgressBar>
                                                    : <Button title={t('history.download')} disabled={isDownload} variant={'ghost'} className='flex-shrink-0 p-0 cursor-pointer bg-transparent shadow-none h-auto hover:bg-transparent text-sm' onClick={(e) => download(e, item)}>
                                                        <TbDownload size={18} />
                                                    </Button>}
                                                <Button title={t('history.delete')} disabled={isDownload} variant={'ghost'} className='flex-shrink-0 p-0 cursor-pointer bg-transparent shadow-none h-auto hover:bg-transparent text-sm' onClick={(e) => deleteItem(e, item)}>
                                                    <HiOutlineTrash size={18} />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                    )}</ScrollArea>}
                                {!list.length && <div className='flex items-center justify-center text-sm mt-8'>
                                    {t('tts.no results')}
                                </div>}

                            </div>
                        </div>
                        <div className='flex flex-col h-full flex-1 temo-no-draggable'>
                            <div className='flex flex-1 overflow-hidden'>
                                {!!currentFile && <div className='my-3 flex-1'>
                                    <div className="mb-2 font-medium">{currentFile.title}</div>
                                    <audio
                                        className="w-full"
                                        controls
                                        src={getLocalFileUrl(currentFile.fileUrl!)}
                                    />
                                </div>}
                                {!!curEditorData && <div className=' px-4 pb-4 flex flex-1'>
                                    <div className='flex flex-1  flex-col  border h-full p-3 pr-0 rounded-md'>
                                        <Tiptap updateList={generateAudio} content={curEditorData} currentFile={currentFile} bgmData={currentFile?.bgm} />
                                    </div>
                                </div>}
                            </div>
                            {/* {!!currentFile && <div className=' h-24 flex-shrink-0'>控制条</div>} */}
                        </div>
                    </div>
                </div>}
            {!temoData.length && <div className='flex items-center justify-center h-full'>
                {t('tts.no results')}
            </div>}
        </>
    )
}))

export default HistoryPage
