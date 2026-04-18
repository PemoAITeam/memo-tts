/* eslint-disable no-case-declarations */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { inject, observer } from 'mobx-react'
import { useTranslation } from 'react-i18next'
import type { Editor } from '@tiptap/react'
import { merge } from 'lodash-es'

import HistoryAudioPlayer from '@/app/components/business/history-audio-player'
import Tiptap from '@/app/components/business/tiptap'
import { useToast } from '@/app/components/ui/use-toast'
import {
  buildTTSSelection,
  isLegacyTTSSelection,
  parseStoredTTSSelection,
  resolveStoredTTSSelection,
} from '@/app/lib/tts-plugin'
import { generateUUID, getLocalFileUrl, secondsToHMS, updateTemoData } from '@/app/lib/utils'
import type AppStore from '@/app/stores/appStore'
import type DataStore from '@/app/stores/dataStore'
import type PluginStore from '@/app/stores/pluginStore'

interface HomePageProps {
  dataStore?: DataStore
  appStore?: AppStore
  pluginStore?: PluginStore
}

const HomePage = inject('dataStore', 'appStore', 'pluginStore')(observer(({
  dataStore,
  appStore,
  pluginStore,
}: HomePageProps) => {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { toast } = useToast()

  const [provider, setProvider] = useState('')
  const [curEditorData, setCurEditorData] = useState<any>()
  const [editorRef, setEditorRef] = useState<Editor>()
  const [mediaReloadVersions, setMediaReloadVersions] = useState<Record<string, number>>({})
  const [mediaReadyVersions, setMediaReadyVersions] = useState<Record<string, number>>({})

  const { currentTTSProgress, currentTTSUUID, mergeTemo, synthesizing } = dataStore!
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastAutoplayTokenRef = useRef<number | null>(null)

  const selectedHistoryItem = id ? dataStore?.temoData.find((item) => item.uuid === id) : undefined
  const currentFile = selectedHistoryItem ? updateTemoData(selectedHistoryItem) : undefined
  const storedSelection = currentFile ? parseStoredTTSSelection(currentFile.ttsOptions) : undefined
  const currentFileUuid = currentFile?.uuid
  const currentFileEditorData = currentFile?.editorData
  const storedSelectionProvider = storedSelection?.provider
  const draftEditorData = currentFileUuid ? undefined : dataStore?.editorData
  const ttsProviders = pluginStore?.ttsProviders
  const activeProvider = provider || pluginStore?.provider || storedSelection?.provider || ''
  const autoplayState = location.state as { autoplayId?: string; autoplayToken?: number } | null
  const autoplayToken = autoplayState && currentFile && autoplayState.autoplayId === currentFile.uuid
    ? autoplayState.autoplayToken
    : undefined
  const mediaReloadVersion = currentFile ? mediaReloadVersions[currentFile.uuid] || 0 : 0
  const mediaReadyVersion = currentFile ? mediaReadyVersions[currentFile.uuid] || 0 : 0
  const previewMediaSrc = currentFile?.fileUrl && mediaReadyVersion === mediaReloadVersion
    ? getLocalFileUrl(currentFile.fileUrl)
    : ''

  useEffect(() => {
    if (currentFileUuid) {
      setCurEditorData(currentFileEditorData)

      if (storedSelectionProvider) {
        const providerMeta = pluginStore?.findTTSProviderByValue(storedSelectionProvider)
        if (providerMeta) {
          setProvider(providerMeta.provider)
          if (pluginStore?.provider !== providerMeta.provider) {
            pluginStore?.setProvider(providerMeta.provider)
          }
        }
      }
      return
    }

    setCurEditorData(draftEditorData || '')
  }, [currentFileEditorData, currentFileUuid, draftEditorData, pluginStore, storedSelectionProvider, ttsProviders])

  useEffect(() => {
    if (!currentFile?.fileUrl) {
      return
    }

    let cancelled = false
    let timer: number | undefined
    const checkFileExist = window.AIM?.file?.checkFileExist
    const nextVersion = mediaReloadVersion

    const markReady = () => {
      if (cancelled) {
        return
      }

      setMediaReadyVersions((versions) => {
        if (versions[currentFile.uuid] === nextVersion) {
          return versions
        }

        return {
          ...versions,
          [currentFile.uuid]: nextVersion,
        }
      })
    }

    if (!checkFileExist) {
      markReady()
      return () => {
        cancelled = true
      }
    }

    const pollFile = async (attempt = 0) => {
      try {
        const exists = await checkFileExist(currentFile.fileUrl!)

        if (cancelled) {
          return
        }

        if (exists) {
          markReady()
          return
        }
      } catch (_error) {
        if (cancelled) {
          return
        }
      }

      if (attempt >= 20) {
        markReady()
        return
      }

      timer = window.setTimeout(() => {
        void pollFile(attempt + 1)
      }, 300)
    }

    void pollFile()

    return () => {
      cancelled = true
      if (timer) {
        window.clearTimeout(timer)
      }
    }
  }, [currentFile?.fileUrl, currentFile?.uuid, mediaReloadVersion])

  useEffect(() => {
    if (currentFile?.type !== 'video' || !previewMediaSrc) {
      return
    }

    videoRef.current?.load()
  }, [currentFile?.type, previewMediaSrc])

  useEffect(() => {
    if (currentFile?.type !== 'video' || !autoplayToken) {
      return
    }

    if (lastAutoplayTokenRef.current === autoplayToken) {
      return
    }

    const media = videoRef.current
    if (!media) {
      return
    }

    lastAutoplayTokenRef.current = autoplayToken

    const playMedia = async () => {
      try {
        media.currentTime = 0
        await media.play()
      } catch (_error) {
        toast({
          variant: 'destructive',
          description: t('history.play fail', { defaultValue: '音频播放失败' }),
        })
      }
    }

    if (media.readyState >= 1) {
      void playMedia()
      return
    }

    const handleLoadedMetadata = () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata)
      void playMedia()
    }

    media.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      media.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [autoplayToken, currentFile?.type, t, toast])

  const handler = useCallback((_event: any, messageData: any) => {
    switch (messageData.type) {
      case 'temo:audio:abort':
        break
      case 'temo:audio:error':
        const error = messageData.data?.message
        if (typeof error === 'string' && error.includes('Unsupported voice')) {
          toast({
            variant: 'destructive',
            description: t('Unsupported voice'),
          })
        } else if (error) {
          toast({
            variant: 'destructive',
            description: error,
          })
        }
        break
    }
  }, [t, toast])

  useEffect(() => {
    window.AIM?.handleMessage(handler, 'MemoTTSContent')

    return () => {
      window.AIM.removeHandler('MemoTTSContent')
    }
  }, [handler])

  const handleEditorChange = useCallback((nextEditor: Editor) => {
    setEditorRef(nextEditor)
  }, [])

  const handleProviderChange = useCallback((nextProvider: string) => {
    setProvider(nextProvider)
  }, [])

  const buildHomeSelection = useCallback(() => {
    if (!activeProvider) {
      return undefined
    }

    const providerMeta = pluginStore?.findTTSProviderByValue(activeProvider)
    if (!providerMeta) {
      return undefined
    }

    const manifest = pluginStore?.findManifestByProviderValue(activeProvider)
    const version = pluginStore?.memoPlugins?.localPlugins?.versions?.[providerMeta.pluginId]
    const storedPluginConfig = version
      ? pluginStore?.memoPlugins?.pluginsConfigurations?.[`${providerMeta.pluginId}@${version}`] || {}
      : {}
    const runtimeConfig = pluginStore?.getRuntimeTTSConfiguration(activeProvider) || {}

    if (storedSelection && !isLegacyTTSSelection(storedSelection) && storedSelection.provider === activeProvider) {
      const resolvedSelection = resolveStoredTTSSelection(storedSelection, providerMeta, manifest)

      return buildTTSSelection({
        providerMeta,
        manifest,
        target: 'original',
        config: merge({}, manifest?.defaultsConfiguration || {}, storedPluginConfig, resolvedSelection?.config || {}, runtimeConfig),
      })
    }

    return buildTTSSelection({
      providerMeta,
      manifest,
      target: 'original',
      config: merge({}, manifest?.defaultsConfiguration || {}, storedPluginConfig, runtimeConfig),
    })
  }, [activeProvider, pluginStore, storedSelection])

  const canSynthesize = !!editorRef && !!buildHomeSelection()

  const generateAudio = async () => {
    const selection = buildHomeSelection()
    if (!selection || !editorRef) {
      toast({
        variant: 'destructive',
        description: t('tts.select voice', { defaultValue: 'Please select a TTS plugin and voice first.' }),
      })
      return
    }

    try {
      const editorJSON = editorRef.getJSON()

      const result = await mergeTemo({
        selection,
        uuid: currentFile?.uuid || generateUUID(),
        editorData: editorJSON,
      })

      if (result) {
        const nextResult = updateTemoData({
          ...result,
          voiceLocalName: result.voiceLocalName || selection.displayLabel,
          ttsOptions: result.ttsOptions || selection,
          duration: secondsToHMS(result.metadata?.duration),
        })

        dataStore?.upsertTemoData(nextResult)
        appStore?.setTemoId(nextResult.uuid)
        setMediaReloadVersions((versions) => ({
          ...versions,
          [nextResult.uuid]: (versions[nextResult.uuid] || 0) + 1,
        }))

        if (!currentFile) {
          editorRef.commands.clearContent()
          editorRef.chain().insertContentAt(editorRef.state.selection.head, { type: 'editorCard' }).focus().run()
          dataStore?.setEditorData('')
          dataStore?.setTTSType('audio', true)
        }

        navigate(`/home/${nextResult.uuid}`)
      }
    } catch (error) {
      console.log(error)
    }
  }

  const stopGenerateAudio = () => {
    window.AIM.tts.abortMergeTemo()
  }

  return (
    <div className='flex flex-col h-full'>
      <div className='flex flex-1 temo-draggable pt-4 overflow-hidden'>
        <div className='flex-1 pl-4 pb-4 flex temo-no-draggable'>
          <div className='flex flex-col flex-1 border h-full p-3 pr-0 rounded-md'>
            <Tiptap
              key={currentFile?.uuid || 'draft'}
              content={curEditorData}
              setEditor={handleEditorChange}
              ttsProvider={activeProvider}
              onProviderChange={handleProviderChange}
              onSynthesize={generateAudio}
              onStopSynthesis={stopGenerateAudio}
              synthesisActive={!!currentTTSUUID}
              synthesisProgress={currentTTSProgress}
              synthesisDisabled={synthesizing || !canSynthesize}
              synthesisBusy={synthesizing}
              showEmptyGuide={!currentFile}
              persistDraft={!currentFile}
            />

            {currentFile?.fileUrl && previewMediaSrc && (
              <div className='mr-3 mt-4'>
                {currentFile.type === 'video'
                  ? (
                    <div className='overflow-hidden rounded-[1.5rem] border border-border/70 bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--background))_55%,hsl(var(--muted)/0.8)_100%)] p-2 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.28)]'>
                      <video
                        key={`${currentFile.uuid}-${mediaReadyVersion}`}
                        ref={videoRef}
                        className='w-full max-h-64 rounded-[1rem] bg-black'
                        controls
                        src={previewMediaSrc}
                      />
                    </div>
                  )
                  : (
                    <HistoryAudioPlayer
                      key={`${currentFile.uuid}-${mediaReadyVersion}`}
                      src={previewMediaSrc}
                      autoplayToken={autoplayToken}
                    />
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}))

export default HomePage
