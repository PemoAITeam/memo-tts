import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { inject, observer } from 'mobx-react'
import { cloneDeep } from 'lodash-es'
import { TbDownload, TbPlus } from 'react-icons/tb'
import { HiOutlineTrash } from 'react-icons/hi2'
import { FaPlay } from 'react-icons/fa'

import { Button } from '@/app/components/ui/button'
import { ScrollArea } from '@/app/components/ui/scroll-area'
import { useToast } from '@/app/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import CircularProgressBar from '@/app/components/business/progress'
import HomePage from '@/app/pages/home/home'
import type { TemoData, TemoFileList } from '@/app/interface'
import { getTextFragment } from '@/app/lib/utils'
import type DataStore from '@/app/stores/dataStore'
import type AppStore from '@/app/stores/appStore'
import { useTranslation } from 'react-i18next'
import './routes.scss'

interface RouterPageProps {
  dataStore?: DataStore
  appStore?: AppStore
}

const Routers = inject('dataStore', 'appStore')(observer(({ dataStore, appStore }: RouterPageProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t } = useTranslation()
  const { temoData = [] } = dataStore || {}
  const [isDownload, setIsDownload] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadTargetId, setDownloadTargetId] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteItems, setPendingDeleteItems] = useState<TemoData[]>([])
  const selectedHistoryId = location.pathname.startsWith('/home/')
    ? decodeURIComponent(location.pathname.split('/')[2] || '')
    : ''

  useEffect(() => {
    appStore?.setTemoId(selectedHistoryId || 'home')
  }, [appStore, selectedHistoryId])

  const handler = useCallback((_event: any, messageData: any) => {
    switch (messageData.type) {
      case 'tts:media:progress':
        if (messageData.data.progress * 100 > 1) {
          setDownloadProgress(messageData.data.progress)
        }
        break
      case 'tts:media:done':
        setIsDownload(false)
        setDownloadProgress(0)
        setDownloadTargetId('')
        toast({
          description: t('history.save success'),
        })
        break
    }
  }, [t, toast])

  useEffect(() => {
    window.AIM?.handleMessage(handler, 'MemoTTSSidebar')

    return () => {
      window.AIM.removeHandler('MemoTTSSidebar')
    }
  }, [handler])

  const openDraft = () => {
    appStore?.setTemoId('home')
    navigate('/home')
  }

  const openHistoryItem = (item: TemoData, autoplay?: boolean) => {
    appStore?.setTemoId(item.uuid)
    navigate(`/home/${item.uuid}`, autoplay
      ? { state: { autoplayId: item.uuid, autoplayToken: Date.now() } }
      : undefined)
  }

  const showSaveVideoDialog = async (title: string, data: TemoData[]) => {
    const file: any = await window.AIM.openDialog('showSaveDialog', {
      defaultPath: `${title}.mp4`,
      filters: [
        {
          name: '',
          extensions: ['mp4'],
        },
      ],
      properties: [],
    })

    if (file?.canceled) {
      setIsDownload(false)
      setDownloadProgress(0)
      setDownloadTargetId('')
      return
    }

    const curFile = data[0]
    let from = 0
    const list: TemoFileList[] = curFile.fileList?.map((item: any) => {
      const nextItem = {
        ...item,
        from,
        duration: Math.ceil(item.metadata.duration),
      }
      from += Math.ceil(item.metadata.duration)
      return nextItem
    })

    const params: any = {
      type: curFile.type!,
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
      duration: Math.ceil(curFile.metadata?.duration),
    }

    const copyFiles = [curFile.fileUrl]
    if (params.bgm) {
      copyFiles.push(params.bgm.path)
    }
    params.copyFiles = copyFiles

    try {
      setIsDownload(true)
      setDownloadProgress(0.01)
      await window.AIM.tts.renderMedia(cloneDeep(params), file.filePath)
    } finally {
      setIsDownload(false)
      setDownloadProgress(0)
      setDownloadTargetId('')
    }
  }

  const showSaveAudioDialog = async (title: string, data: any[]) => {
    const file: any = await window.AIM.openDialog('showSaveDialog', {
      defaultPath: `${title}.zip`,
      filters: [
        {
          name: '',
          extensions: ['zip'],
        },
      ],
      properties: [],
    })

    if (file?.canceled) {
      setIsDownload(false)
      setDownloadTargetId('')
      return
    }

    try {
      setIsDownload(true)
      const result = await window.AIM.tts.temoDownload(cloneDeep(data), file.filePath)
      if (result === 'Successful') {
        toast({
          description: t('history.save success'),
        })
      } else {
        toast({
          variant: 'destructive',
          description: t('history.save fail'),
        })
      }
    } finally {
      setIsDownload(false)
      setDownloadTargetId('')
    }
  }

  const download = async (event: any, data: TemoData) => {
    if (event) {
      event.stopPropagation()
    }

    setDownloadTargetId(data.uuid)

    if (data.type === 'video') {
      await showSaveVideoDialog(data.title, [{ ...data }])
      return
    }

    const srtData = getTextFragment(data.infoData)
    await showSaveAudioDialog(data.title, [{ ...data, srtData }])
  }

  const requestDelete = (event: any, data: TemoData) => {
    if (event) {
      event.stopPropagation()
    }

    setPendingDeleteItems([data])
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteItems.length) {
      setDeleteDialogOpen(false)
      return
    }

    const deleteIds = new Set(pendingDeleteItems.map((item) => item.uuid))
    const nextList = temoData.filter((item) => !deleteIds.has(item.uuid))

    try {
      await dataStore?.removeTemoData(pendingDeleteItems)
      setDeleteDialogOpen(false)
      setPendingDeleteItems([])

      if (deleteIds.has(selectedHistoryId)) {
        const nextId = nextList[0]?.uuid
        navigate(nextId ? `/home/${nextId}` : '/home')
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        description: error?.message || t('history.permanent delete fail', { defaultValue: '删除失败，请重试' }),
      })
    }
  }

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setDeleteDialogOpen(open)
    if (!open) {
      setPendingDeleteItems([])
    }
  }

  return (
    <>
      <div className='flex h-full'>
        <div className='history-sidebar bg-background border-r page-left-tabs'>
          <div className='history-sidebar-header temo-no-draggable'>
            <Button
              variant={selectedHistoryId ? 'ghost' : 'default'}
              onClick={openDraft}
              className='w-full justify-start'
            >
              <TbPlus size={18} />
              <span>{t('route.new script', { defaultValue: '新建脚本' })}</span>
            </Button>
          </div>
          <div className='history-sidebar-body temo-no-draggable'>
            {!!temoData.length && (
              <ScrollArea className='h-full pr-2'>
                <div className='history-sidebar-list'>
                  {temoData.map((item) => (
                    <div
                      key={item.uuid}
                      className={`history-sidebar-item ${selectedHistoryId === item.uuid ? 'is-selected' : ''}`}
                      onClick={() => openHistoryItem(item)}
                    >
                      <Button
                        title={t('history.play', { defaultValue: '播放' })}
                        variant='ghost'
                        className='history-sidebar-play'
                        onClick={(event) => {
                          event.stopPropagation()
                          openHistoryItem(item, true)
                        }}
                      >
                        <FaPlay size={12} />
                      </Button>
                      <div className='history-sidebar-copy'>
                        <div className='history-sidebar-title'>{item.title}</div>
                        <div className='history-sidebar-meta'>
                          <span>{item.voiceLocalName}</span>
                          <span>{item.duration}</span>
                        </div>
                      </div>
                      {(isDownload && downloadTargetId === item.uuid)
                        ? <CircularProgressBar progress={downloadProgress} />
                        : (
                          <Button
                            title={t('history.download')}
                            disabled={isDownload}
                            variant='ghost'
                            className='history-sidebar-action'
                            onClick={(event) => download(event, item)}
                          >
                            <TbDownload size={16} />
                          </Button>
                        )}
                      <Button
                        title={t('history.delete')}
                        disabled={isDownload}
                        variant='ghost'
                        className='history-sidebar-action'
                        onClick={(event) => requestDelete(event, item)}
                      >
                        <HiOutlineTrash size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {!temoData.length && (
              <div className='history-sidebar-empty'>
                {t('tts.no results')}
              </div>
            )}
          </div>
        </div>
        <div className='flex-1 overflow-x-hidden h-full bg-background page-right-content'>
          <Routes>
            <Route path='/' element={<Navigate to='/home' replace />} />
            <Route path='/home' element={<HomePage />} />
            <Route path='/home/:id' element={<HomePage />} />
          </Routes>
        </div>
      </div>
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

export default Routers
