/* eslint-disable no-case-declarations */
import './history.scss'
import { Button } from '@/app/components/ui/button';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getTextFragment } from '@/app/lib/utils';
// import { AiOutlineLoading3Quarters } from "react-icons/ai";
// import { PiVinylRecord } from "react-icons/pi";
import { GrCheckboxSelected } from "react-icons/gr";
// import { Editor } from '@tiptap/react';
import { useToast } from "@/app/components/ui/use-toast"
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Slider } from '@/app/components/ui/slider';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { inject, observer } from 'mobx-react';
import SettingStore from '@/app/stores/settingStore';
import DataStore from '@/app/stores/dataStore';
import { useParams } from 'react-router-dom';
import AppStore from '@/app/stores/appStore';
// import TTSPanel from '@/app/components/business/tts-panel';
import { cloneDeep } from 'lodash-es';
import { TbDownload } from "react-icons/tb";
import { HiOutlineTrash } from "react-icons/hi2";
import { FaPause, FaPlay } from "react-icons/fa";
import { TemoData, TemoFileList } from '@/app/interface';
// import { RiFileList3Line } from "react-icons/ri";
import { useTranslation } from 'react-i18next';
import CircularProgressBar from '@/app/components/business/progress';
import { getLocalFileUrl } from '@/app/lib/utils';

declare const window: any;

interface HomePageProps {
    settingStore?: SettingStore
    dataStore?: DataStore
    appStore?: AppStore
}

const formatPlaybackTime = (time: number) => {
    if (!Number.isFinite(time) || time < 0) {
        return '00:00'
    }

    const totalSeconds = Math.floor(time)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const HistoryPage = inject('settingStore', 'dataStore', 'appStore')(observer(({ dataStore }: HomePageProps) => {
    const { id } = useParams()
    const { temoData = [] } = dataStore!
    const [curTemoId, setCurTemoId] = useState<string>('');
    const [list, setList] = useState<TemoData[]>([])
    const [batchDownload] = useState<boolean>(false);
    const [isDownload, setIsDownload] = useState<boolean>(false);
    const [downloadProgress, setDownloadProgress] = useState<number>(0);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [pendingDeleteItems, setPendingDeleteItems] = useState<TemoData[]>([]);
    const [activePlaybackId, setActivePlaybackId] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);
    const { t } = useTranslation()
    const { toast } = useToast()
    const audioRef = useRef<HTMLAudioElement>(null)

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
        }
    }, [temoData, id])

    useEffect(() => {
        const audio = audioRef.current

        if (!audio) {
            return
        }

        const syncDuration = () => {
            setPlaybackDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
        }

        const handleTimeUpdate = () => {
            setPlaybackTime(audio.currentTime || 0)
        }

        const handleLoadedMetadata = () => {
            syncDuration()
            setPlaybackTime(audio.currentTime || 0)
        }

        const handlePlay = () => {
            setIsPlaying(true)
            syncDuration()
        }

        const handlePause = () => {
            setIsPlaying(false)
        }

        const handleEnded = () => {
            audio.currentTime = 0
            setPlaybackTime(0)
            setIsPlaying(false)
        }

        const handleError = () => {
            setIsPlaying(false)
            toast({
                variant: "destructive",
                description: t('history.play fail', { defaultValue: '音频播放失败' })
            })
        }

        audio.addEventListener('timeupdate', handleTimeUpdate)
        audio.addEventListener('loadedmetadata', handleLoadedMetadata)
        audio.addEventListener('play', handlePlay)
        audio.addEventListener('pause', handlePause)
        audio.addEventListener('ended', handleEnded)
        audio.addEventListener('error', handleError)

        return () => {
            audio.pause()
            audio.removeEventListener('timeupdate', handleTimeUpdate)
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
            audio.removeEventListener('play', handlePlay)
            audio.removeEventListener('pause', handlePause)
            audio.removeEventListener('ended', handleEnded)
            audio.removeEventListener('error', handleError)
        }
    }, [t, toast])

    useEffect(() => {
        if (!activePlaybackId) {
            return
        }

        const activeItemStillExists = temoData.some(item => item.uuid === activePlaybackId)
        if (activeItemStillExists) {
            return
        }

        const audio = audioRef.current
        if (audio) {
            audio.pause()
            audio.removeAttribute('src')
            audio.load()
        }

        setActivePlaybackId('')
        setIsPlaying(false)
        setPlaybackTime(0)
        setPlaybackDuration(0)
    }, [activePlaybackId, temoData])


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
                if (typeof error === 'string' && error.includes('Unsupported voice')) {
                    toast({
                        variant: "destructive",
                        description: t('Unsupported voice')
                    })
                } else if (error) {
                    toast({
                        variant: "destructive",
                        description: error
                    })
                }
                break
        }
    }, [t, toast])

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
        setCurTemoId(data.uuid)
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

    const togglePlayback = async (event: any, data: TemoData) => {
        if (event) {
            event.stopPropagation();
        }

        const audio = audioRef.current
        if (!audio || !data.fileUrl) {
            return
        }

        setCurTemoId(data.uuid)

        if (activePlaybackId === data.uuid) {
            if (isPlaying) {
                audio.pause()
                return
            }

            try {
                await audio.play()
            } catch (_error) {
                toast({
                    variant: "destructive",
                    description: t('history.play fail', { defaultValue: '音频播放失败' })
                })
            }
            return
        }

        audio.pause()
        audio.src = getLocalFileUrl(data.fileUrl)
        audio.currentTime = 0

        setActivePlaybackId(data.uuid)
        setPlaybackTime(0)
        setPlaybackDuration(0)

        try {
            await audio.play()
        } catch (_error) {
            setActivePlaybackId('')
            setPlaybackTime(0)
            setPlaybackDuration(0)
            toast({
                variant: "destructive",
                description: t('history.play fail', { defaultValue: '音频播放失败' })
            })
        }
    }

    const seekPlayback = (value: number[]) => {
        const nextTime = value[0] ?? 0
        setPlaybackTime(nextTime)
    }

    const commitPlaybackSeek = (value: number[]) => {
        const audio = audioRef.current
        if (!audio) {
            return
        }

        const nextTime = value[0] ?? 0
        audio.currentTime = nextTime
        setPlaybackTime(nextTime)
    }

    const selectItem = (data: TemoData) => {
        if (batchDownload) {
            const updatedData = list.map(item =>
                item.uuid === data.uuid ? { ...item, selected: !data.selected } : item
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

    const requestDelete = (event: any, data?: TemoData) => {
        if (event) {
            event.stopPropagation();
        }
        let items: TemoData[] = [];
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
        setPendingDeleteItems(items)
        setDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!pendingDeleteItems.length) {
            setDeleteDialogOpen(false)
            return
        }

        const deleteIds = new Set(pendingDeleteItems.map(item => item.uuid))
        const nextList = temoData.filter(item => !deleteIds.has(item.uuid))

        try {
            await dataStore?.removeTemoData(pendingDeleteItems)
            setList(nextList)
            setDeleteDialogOpen(false)
            setPendingDeleteItems([])

            if (deleteIds.has(activePlaybackId)) {
                const audio = audioRef.current
                if (audio) {
                    audio.pause()
                    audio.removeAttribute('src')
                    audio.load()
                }
                setActivePlaybackId('')
                setIsPlaying(false)
                setPlaybackTime(0)
                setPlaybackDuration(0)
            }

            if (deleteIds.has(curTemoId)) {
                const nextId = nextList[0]?.uuid || ''
                setCurTemoId(nextId)
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                description: error?.message || t('history.permanent delete fail', { defaultValue: '鍒犻櫎澶辫触锛岃閲嶈瘯' })
            })
        }
    }

    const handleDeleteDialogOpenChange = (open: boolean) => {
        setDeleteDialogOpen(open)
        if (!open) {
            setPendingDeleteItems([])
        }
    }

    const getPlaybackDurationLabel = (item: TemoData) => {
        if (activePlaybackId === item.uuid && playbackDuration > 0) {
            return formatPlaybackTime(playbackDuration)
        }

        return item.duration || '00:00'
    }

    return (
        <>
            {!!temoData.length &&
                <div className="flex flex-col h-full">
                    <div className='flex flex-1 temo-draggable temo-content pt-4'>
                        <div className='pl-4 pr-4 flex flex-1 min-w-0 flex-col'>
                            <div className='temo-no-draggable list-scroll-area'>
                                {!!list.length &&
                                    <ScrollArea className='pr-3'> {list.map(item => (
                                        <div key={item.uuid} className='relative cursor-pointer' onClick={() => selectItem(item)}>
                                            {batchDownload && !item.selected && <span className='absolute w-3 h-3 border right-2 top-1'></span>}
                                            {batchDownload && item.selected && <span className='absolute w-3 h-3 right-2 top-1'><GrCheckboxSelected size={12} /></span>}
                                            <div className={`history-list-item rounded-md border mb-3 ${curTemoId == item.uuid ? 'is-selected' : ''}`}>
                                                <div className='flex flex-1 items-center space-x-3 p-3'>
                                                    <Button
                                                        title={activePlaybackId === item.uuid && isPlaying
                                                            ? t('history.pause', { defaultValue: '暂停' })
                                                            : t('history.play', { defaultValue: '播放' })}
                                                        variant={'ghost'}
                                                        className='history-play-button'
                                                        onClick={(e) => togglePlayback(e, item)}
                                                    >
                                                        {activePlaybackId === item.uuid && isPlaying
                                                            ? <FaPause size={14} />
                                                            : <FaPlay size={14} />}
                                                    </Button>
                                                    <div className="flex-1 space-y-1 min-w-0">
                                                        <p className="font-medium truncate">
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
                                                    <Button title={t('history.delete')} disabled={isDownload} variant={'ghost'} className='flex-shrink-0 p-0 cursor-pointer bg-transparent shadow-none h-auto hover:bg-transparent text-sm' onClick={(e) => requestDelete(e, item)}>
                                                        <HiOutlineTrash size={18} />
                                                    </Button>
                                                </div>
                                                {activePlaybackId === item.uuid && (
                                                    <div className='history-inline-player'>
                                                        <span className='history-time-label'>
                                                            {formatPlaybackTime(playbackTime)}
                                                        </span>
                                                        <Slider
                                                            value={[playbackTime]}
                                                            min={0}
                                                            max={playbackDuration || 1}
                                                            step={0.1}
                                                            onValueChange={seekPlayback}
                                                            onValueCommit={commitPlaybackSeek}
                                                            aria-label={t('history.playback progress', { defaultValue: '播放进度' })}
                                                            className='history-progress-slider'
                                                        />
                                                        <span className='history-time-label'>
                                                            {getPlaybackDurationLabel(item)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                    )}</ScrollArea>}
                                {!list.length && <div className='flex items-center justify-center text-sm mt-8'>
                                    {t('tts.no results')}
                                </div>}
                            </div>
                        </div>
                    </div>
                </div>}
            {!temoData.length && <div className='flex items-center justify-center h-full'>
                {t('tts.no results')}
            </div>}
            <audio className='audioRef' ref={audioRef} preload='metadata' />
            <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('history.permanent delete title', { defaultValue: '永久删除？' })}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingDeleteItems.length > 1
                                ? t('history.permanent delete multiple', {
                                    count: pendingDeleteItems.length,
                                    defaultValue: `这将永久删除 ${pendingDeleteItems.length} 项内容，且无法恢复。`,
                                })
                                : t('history.permanent delete single', {
                                    title: pendingDeleteItems[0]?.title || '',
                                    defaultValue: `这将永久删除“${pendingDeleteItems[0]?.title || ''}”，且无法恢复。`,
                                })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('history.cancel', { defaultValue: '取消' })}</AlertDialogCancel>
                        <AlertDialogAction className='bg-red-600 hover:bg-red-600/90' onClick={confirmDelete}>
                            {t('history.permanent delete confirm', { defaultValue: '永久删除' })}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}))

export default HistoryPage
