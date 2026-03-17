import { BgmData, EditorData, LibraryData, TemoData } from '@/app/interface';
import { getJSONDataFromEditorContents, getSpeed, patchTemoData, splitString, updateTemoData, extractTextSegmentsFromNode, TextSegment } from '@/app/lib/utils';
import { cloneDeep } from 'lodash-es';
import md5 from 'md5';
import { makeAutoObservable, runInAction } from 'mobx'
import { makePersistable } from 'mobx-persist-store'
import { settingStore } from '.';
import { toast } from '@/app/components/ui/use-toast';
import i18n from 'i18next'
import { eventBus } from '@/events/eventBus';
import { customEvents } from '@/events/eventBus';

const MAX_TEXT_LENGTH = 1000

class DataStore {
  constructor() {
    makeAutoObservable(this)
    makePersistable(this, {
      name: 'dataStore',
      properties: [
        'temoData',
        'editorData',
        'trashData',
        'libraryData',
        'TTSType',
        'bgm'
      ],
    });
  }

  temoData: TemoData[] = []

  editorData: { type: 'doc', content: EditorData } | string = ''

  trashData: TemoData[] = []

  libraryData: LibraryData[] = []

  TTSType: 'audio' | 'video' = 'audio'

  CurTTSType: 'audio' | 'video' = 'audio'//主页编辑的ttstype, 主要用于存储

  bgm: BgmData | null = null

  setBgm = (bgm: BgmData | null) => {
    this.bgm = bgm ? cloneDeep(bgm) : null
    if (this.bgm) {
      localStorage.setItem('temo-tts-bgm', JSON.stringify(this.bgm))
    } else {
      localStorage.removeItem('temo-tts-bgm')
    }
  }

  setTTSType = (type: 'audio' | 'video', needSave?: boolean) => {
    this.TTSType = type
    if (needSave) {
      this.CurTTSType = type
      localStorage.setItem('temo-tts-type', this.TTSType)
    }
  }

  setTemoData = (data: TemoData) => {
    this.temoData.unshift(data)
  }

  setEditorData = (data: any) => {
    this.editorData = data;
    localStorage.setItem('temo-editor', JSON.stringify(data))
  }

  setTrashData = (data: TemoData[]) => {
    this.trashData = data.concat(this.trashData)
    window.AIM.tts.saveTemoTrash(cloneDeep(this.trashData))
    data.forEach(info => {
      const index = this.temoData.findIndex(item => item.uuid === info.uuid)
      if (index > -1) {
        const newData = cloneDeep(this.temoData)
        newData.splice(index, 1)
        this.temoData = newData
      }
    })
    window.AIM.tts.updateTemoData(cloneDeep(this.temoData))
  }

  deleteTrashData = (data: TemoData[], isDelete?: boolean) => {
    if (this.trashData.length) {
      data.forEach(info => {
        const index = this.trashData.findIndex(item => item.uuid === info.uuid)
        if (index > -1) {
          const newData = cloneDeep(this.trashData)
          newData.splice(index, 1)
          this.trashData = newData
        }
      })
      if (!isDelete) {
        this.temoData = data.concat(this.temoData)
        window.AIM.tts.updateTemoData(cloneDeep(this.temoData))
      }
      window.AIM.tts.saveTemoTrash(cloneDeep(this.trashData), isDelete ? data.map(item => item.uuid) : null)
    }
  }

  getTrashData = async () => {
    const trashData = await window.AIM.tts.getTemoTrash() || []
    runInAction(() => {
      this.trashData = trashData
    })
    return trashData
  }

  setLibraryData = (data: LibraryData[]) => {
    this.libraryData = data.concat(this.libraryData)
    window.AIM.tts.saveTemoLibrary(cloneDeep(this.libraryData))
    console.log(data)
  }

  copyLibraryFile = async (path: string, type: 'pic' | 'media', duration?: string) => {
    const data = await window.AIM.tts.copyTemoFile(path, 'library')
    if (!data.exist) {
      data.type = type
      data.duration = duration
      this.setLibraryData([data])
    }
  }

  initData = async () => {
    let temoData = await window.AIM.tts.getTemoData() || []
    if (temoData?.length) {
      temoData = temoData.map((item: TemoData) => {
        if (!item.fileList) {
          item.fileList = patchTemoData(item);
        }
        return updateTemoData(item)
      })
    }
    const editorData = localStorage.getItem('temo-editor') || ""
    const ttsType = localStorage.getItem('temo-tts-type') || 'audio'
    const bgm = localStorage.getItem('temo-tts-bgm')
    const libraryData = await window.AIM.tts.getTemoLibrary() || []
    runInAction(() => {
      this.temoData = temoData
      this.editorData = editorData ? JSON.parse(editorData) : ''
      this.CurTTSType = this.TTSType = ttsType as 'audio' | 'video'
      this.bgm = bgm ? JSON.parse(bgm) : null
      this.libraryData = libraryData
    })
  }
  // export interface TTSParams {
  //     data: TTSOptions,
  //     file: ITranscriptFile,
  //     ogText?: boolean,
  //     exportPath?: string
  //     provider?: string
  //     md5Prefix?: string
  // }


  currentTTSUUID: string = ''
  currentTTSProgress: number = 0
  synthesizing = false

  mergeTemo = async (
    data: {
      service: 'Edge' | 'OpenAI' | 'Volcano',
      target: string,
      speed: string,
      uuid: string,
      editorData: any,
      bgm?: BgmData,
    },
    options: any
  ) => {
    try {
      console.log('========== mergeTemo 调试 ==========')
      console.log('data.editorData:', data.editorData)
      console.log('data.editorData.content:', data.editorData?.content)
      console.log('data.editorData.content[0]:', JSON.stringify(data.editorData?.content?.[0], null, 2))
      console.log('data.target:', data.target)
      const jsonData: any[] = getJSONDataFromEditorContents(data.editorData.content, data.target);
      console.log('jsonData:', jsonData)
      console.log('====================================')
      if (!jsonData?.length) {
        toast({
          variant: "destructive",
          description: i18n.t('app.edit data')
        })
        return
      }

      // 提取所有文本片段，保留 Mark 属性
      const allSegments: (TextSegment & { cardOptions?: any })[] = []

      jsonData.forEach((item: any) => {
        // 从卡片内容中提取文本片段
        const segments = extractTextSegmentsFromNode(item)
        segments.forEach(seg => {
          allSegments.push({
            ...seg,
            cardOptions: item.attrs?.voice,
          })
        })
      })

      console.log('allSegments with marks:', allSegments)

      let params;
      if (data.service === 'Edge') {
        const globalRate = getSpeed(data.speed);
        params = {
          type: 'Edge',
          lang: options?.lang,
          rate: globalRate,
          pitch: 0,
          voiceName: options?.voice?.shortName,
          voiceLocalName: options?.voice?.properties.LocalName,
          data: allSegments.map((seg) => {
            // 使用片段自己的速度，如果没有则使用全局速度
            const segRate = seg.speed != null ? seg.speed : globalRate
            const text = seg.text.replace(/<br \/>/g, '');
            const segData: any = {
              text,
              md5: md5(String(segRate) + '0' + options?.voice?.shortName + text),
            }
            // 如果片段有自定义速度，添加到 options
            if (seg.speed != null && seg.speed !== globalRate) {
              segData.options = {
                ...seg.cardOptions,
                rate: seg.speed,
              }
            } else if (seg.cardOptions) {
              segData.options = seg.cardOptions
            }
            if (text.length > MAX_TEXT_LENGTH) {
              segData.textChunks = splitString(text)
            }
            return segData
          })
        }
      } else if (data.service === 'OpenAI') {
        if (!settingStore.settings.openAI?.apiKey) {
          toast({
            variant: "destructive",
            description: i18n.t('app.set apikey')
          })
          return
        }
        const globalSpeed = parseFloat(data.speed) || 1;
        params = {
          type: 'OpenAI',
          model: options?.model,
          speed: globalSpeed,
          voice: options?.voice?.value,
          voiceLocalName: options?.voice?.label,
          data: allSegments.map((seg) => {
            const segSpeed = seg.speed != null ? seg.speed : globalSpeed
            const text = seg.text.replace(/<br \/>/g, '');
            const segData: any = {
              text,
              md5: md5(String(segSpeed) + '0' + options?.voice?.value + text),
            }
            if (seg.speed != null && seg.speed !== globalSpeed) {
              segData.options = {
                ...seg.cardOptions,
                speed: seg.speed,
              }
            } else if (seg.cardOptions) {
              segData.options = seg.cardOptions
            }
            if (text.length > MAX_TEXT_LENGTH) {
              segData.textChunks = splitString(text)
            }
            return segData
          })
        }
      } else if (data.service === 'Volcano') {
        if (!settingStore.settings.tts?.volctrans?.accessToken) {
          toast({
            variant: "destructive",
            description: i18n.t('app.set accessToken')
          })
          return
        }
        const globalEmotion = options?.emotion?.value;
        params = {
          type: 'Volc',
          emotion: globalEmotion,
          voice_type: options?.voice?.value,
          voiceLocalName: options?.voice?.label,
          scene: options?.scenes,
          data: allSegments.map((seg) => {
            // 使用片段自己的情绪，如果没有则使用全局情绪
            const segEmotion = seg.emotion && seg.emotion !== 'none' ? seg.emotion : globalEmotion
            const text = seg.text.replace(/<br \/>/g, '').replace(/\n/g, '');
            const segData: any = {
              text,
              md5: md5(String(seg.speed || 1) + '0' + options?.voice?.value + text),
            }
            // 如果片段有自定义情绪，添加到 options
            if (segEmotion && segEmotion !== globalEmotion) {
              segData.options = {
                ...seg.cardOptions,
                emotion: segEmotion,
              }
            } else if (seg.cardOptions) {
              segData.options = seg.cardOptions
            }
            if (text.length > MAX_TEXT_LENGTH) {
              segData.textChunks = splitString(text)
            }
            return segData
          })
        }
      } else {
        params = {
          type: data.service,
          data: allSegments.map((seg) => {
            const text = seg.text.replace(/<br \/>/g, '');
            const segData: any = {
              text,
              md5: md5(text),
            }
            if (seg.cardOptions) {
              segData.options = seg.cardOptions
            }
            if (text.length > MAX_TEXT_LENGTH) {
              segData.textChunks = splitString(text)
            }
            return segData
          })
        }
      }
      this.synthesizing = true
      console.log('========== TTS 合成调试 ==========')
      console.log('提取的文本片段 allSegments:', allSegments)
      console.log('最终提交参数 params:', JSON.stringify(params, null, 2))
      console.log('==================================')
      const result = await window.AIM.tts.mergeTemo(cloneDeep(params), data.uuid, { editorData: cloneDeep(data.editorData), bgm: cloneDeep(data.bgm), type: this.TTSType, ttsOptions: cloneDeep({ service: data.service, speed: data.speed, target: data.target, ttsOptions: options }) });
      console.log(result)
      this.synthesizing = false
      return result
    } catch (error) {
      this.synthesizing = false
      throw error
    }
  }
  handleMessage = async (e: any) => {
    if (e && e.ipcData) {
      const msg = e.ipcData;
      if (msg.type === 'temo:audio:start') {
        console.log('temo:audio:start');
        this.currentTTSUUID = msg.data.uuid
      }
      if (msg.type === 'temo:audio:progress') {
        console.log('temo:audio:progress');
        this.currentTTSProgress = Math.floor(msg.data.percent || 0)
      }
      if (msg.type === 'temo:audio:error') {
        console.log('temo:audio:error');
        this.currentTTSUUID = ''
        this.currentTTSProgress = 0
      }
      if (msg.type === 'temo:audio:abort') {
        console.log('temo:audio:abort');
        this.currentTTSUUID = ''
        this.currentTTSProgress = 0
      }
      if (msg.type === 'temo:audio:end') {
        console.log('temo:audio:end');
        this.currentTTSUUID = ''
        this.currentTTSProgress = 0
      }
    }
  };

  handleDataMessage = () => {
    eventBus.on(customEvents.RendererMessage, this.handleMessage);
  };

  removeDataHandler = () => {
    eventBus.off(customEvents.RendererMessage, this.handleMessage);
  };
}

export default DataStore
