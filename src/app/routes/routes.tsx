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
import { getTemoVoiceLabels } from '@/app/lib/tts-plugin'
import { getTextFragment } from '@/app/lib/utils'
import type DataStore from '@/app/stores/dataStore'
import type AppStore from '@/app/stores/appStore'
import type SettingStore from '@/app/stores/settingStore'
import { useTranslation } from 'react-i18next'

interface RouterPageProps {
  dataStore?: DataStore
  appStore?: AppStore
  settingStore?: SettingStore
}

const HISTORY_MULTI_VOICE_SUMMARY: Record<string, (labels: string[]) => string> = {
  en: (labels) => `${labels[0]}/${labels[1]} and ${labels.length} voices`,
  zh: (labels) => `${labels[0]}/${labels[1]}等${labels.length}个角色`,
  zh_tw: (labels) => `${labels[0]}/${labels[1]}等${labels.length}個角色`,
  ja: (labels) => `${labels[0]}/${labels[1]}など${labels.length}役`,
  ko: (labels) => `${labels[0]}/${labels[1]} 외 ${labels.length}개 역할`,
  es: (labels) => `${labels[0]}/${labels[1]} y ${labels.length} voces`,
  de: (labels) => `${labels[0]}/${labels[1]} und ${labels.length} Stimmen`,
  it: (labels) => `${labels[0]}/${labels[1]} e ${labels.length} voci`,
}

function normalizeUILanguage(language?: string) {
  const normalizedLanguage = String(language || 'en').toLowerCase().replace('-', '_')
  if (normalizedLanguage.startsWith('zh_tw') || normalizedLanguage.startsWith('zh_hk')) {
    return 'zh_tw'
  }
  if (normalizedLanguage.startsWith('zh')) {
    return 'zh'
  }

  return normalizedLanguage.split('_')[0]
}

const WELCOME_VERSION = '1.7.0'
const WELCOME_VERSION_STORAGE_KEY = 'memo-tts-welcome-version'

const Routers = inject('dataStore', 'appStore', 'settingStore')(observer(({ dataStore, appStore, settingStore }: RouterPageProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { t, i18n } = useTranslation()
  const { temoData = [] } = dataStore || {}
  const [isDownload, setIsDownload] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadTargetId, setDownloadTargetId] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [welcomeDialogOpen, setWelcomeDialogOpen] = useState(false)
  const [pendingDeleteItems, setPendingDeleteItems] = useState<TemoData[]>([])
  const selectedHistoryId = location.pathname.startsWith('/home/')
    ? decodeURIComponent(location.pathname.split('/')[2] || '')
    : ''
  const currentLanguage = normalizeUILanguage(i18n.resolvedLanguage || i18n.language)

  useEffect(() => {
    if (!settingStore?.i18nInit) {
      return
    }

    if (localStorage.getItem(WELCOME_VERSION_STORAGE_KEY) === WELCOME_VERSION) {
      return
    }

    setWelcomeDialogOpen(true)
  }, [settingStore?.i18nInit])

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

  const getHistoryVoiceSummary = (item: TemoData) => {
    const labels = getTemoVoiceLabels(item)

    if (!labels.length) {
      return t('tts.no role', { defaultValue: 'No role' })
    }

    if (labels.length === 1) {
      return labels[0]
    }

    if (labels.length === 2) {
      return `${labels[0]}/${labels[1]}`
    }

    return t('history.voice summary multiple', {
      first: labels[0],
      second: labels[1],
      count: labels.length,
      defaultValue: (HISTORY_MULTI_VOICE_SUMMARY[currentLanguage] || HISTORY_MULTI_VOICE_SUMMARY.en)(labels),
    })
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

    params.copyFiles = [curFile.fileUrl]

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

  const confirmWelcome = () => {
    localStorage.setItem(WELCOME_VERSION_STORAGE_KEY, WELCOME_VERSION)
    setWelcomeDialogOpen(false)
  }

  return (
    <>
      <div className='flex h-full'>
        <div className='flex flex-col h-full bg-background border-r w-80 box-border relative flex-shrink-0'>
          <div className='px-3 pb-3 pt-4 border-b temo-no-draggable'>
            <Button
              variant={selectedHistoryId ? 'ghost' : 'default'}
              onClick={openDraft}
              className='w-full justify-start'
            >
              <TbPlus size={18} />
              <span>{t('route.new script')}</span>
            </Button>
          </div>
          <div className='flex-1 min-h-0 pl-3 py-3 temo-no-draggable'>
            {!!temoData.length && (
              <ScrollArea className='h-full pr-2'>
                <div className='flex flex-col gap-2 w-[290px] '>
                  {temoData.map((item) => (
                    <div
                      key={item.uuid}
                      className={`flex items-center gap-2 p-3 border rounded-md cursor-pointer transition-colors ${selectedHistoryId === item.uuid ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => openHistoryItem(item)}
                    >
                      <Button
                        title={t('history.play', { defaultValue: '播放' })}
                        variant='ghost'
                        className='w-8 h-8 p-0 rounded-full flex-shrink-0'
                        onClick={(event) => {
                          event.stopPropagation()
                          openHistoryItem(item, true)
                        }}
                      >
                        <FaPlay size={12} />
                      </Button>
                      <div className='flex-1 min-w-0'>
                        <div className='font-medium truncate'>{item.title}</div>
                        <div className='flex gap-2 mt-1 text-xs text-muted-foreground whitespace-nowrap overflow-hidden'>
                          <span>{getHistoryVoiceSummary(item)}</span>
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
                            className='w-7 h-7 p-0 flex-shrink-0'
                            onClick={(event) => download(event, item)}
                          >
                            <TbDownload size={16} />
                          </Button>
                        )}
                      <Button
                        title={t('history.delete')}
                        disabled={isDownload}
                        variant='ghost'
                        className='w-7 h-7 p-0 flex-shrink-0'
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
              <div className='flex items-center justify-center h-full pr-3 text-muted-foreground text-sm text-center'>
                {t('tts.no results')}
              </div>
            )}
          </div>
        </div>
        <div className='flex-1 overflow-x-hidden h-full bg-background'>
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
            <AlertDialogTitle>{t('history.permanent delete title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteItems.length > 1
                ? t('history.permanent delete multiple', {
                  count: pendingDeleteItems.length,
                })
                : t('history.permanent delete single', {
                  title: pendingDeleteItems[0]?.title || '',
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('history.cancel')}</AlertDialogCancel>
            <AlertDialogAction className='bg-red-600 hover:bg-red-600/90' onClick={confirmDelete}>
              {t('history.permanent delete confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={welcomeDialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setWelcomeDialogOpen(true)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle></AlertDialogTitle>
            <AlertDialogDescription>
              {t('welcome.plugin voices', {
                defaultValue: '已经接入插件，支持多个服务商的多种角色混合配音。',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={confirmWelcome}>
              {t('app.sure', { defaultValue: '确定' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}))

export default Routers
