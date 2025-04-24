import { BgmData, EditorData, LibraryData, TemoData } from '@/app/interface';
import { getJSONDataFromEditorContents, getSpeed, patchTemoData, splitString, updateTemoData } from '@/app/lib/utils';
import { cloneDeep } from 'lodash-es';
import md5 from 'md5';
import { makeAutoObservable, runInAction } from 'mobx'
import { makePersistable } from 'mobx-persist-store'
import { settingStore } from '.';
import { toast } from '@/app/components/ui/use-toast';
import i18n from 'i18next'
import { eventBus } from '@/events/eventBus';
import { customEvents } from '@/events/eventBus';

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

  mergeTemo = async (
    data: {
      service: 'Edge' | 'OpenAI' | 'Volcano',
      target: string,
      speed: string,
      uuid: string,
      editorData: any,
      bgm?: BgmData,
      setGenerating: (params: boolean) => void
    },
    options: any
  ) => {
    const jsonData: any[] = getJSONDataFromEditorContents(data.editorData.content, data.target);
    console.log(jsonData)
    if (!jsonData?.length) {
      toast({
        variant: "destructive",
        description: i18n.t('app.edit data')
      })
      return
    }
    let params;
    if (data.service === 'Edge') {
      const rate = getSpeed(data.speed);
      params = {
        type: 'Edge',
        lang: options?.lang,
        rate: rate,
        pitch: 0,
        voiceName: options?.voice?.shortName,
        voiceLocalName: options?.voice?.properties.LocalName,
        data: jsonData?.map((item: any) => {
          const textData = item.content?.find((info: any) => info.type === 'text')
          const data: any = { text: '', md5: '' }
          if (textData) {
            data.text = textData.text.replace(/<br \/>/g, '');
            data.picture = item.attrs?.picture
            data.md5 = md5((item.attrs?.voice?.rate || rate) + 0 + (item.attrs?.voice ? item.attrs?.voice.voiceLocalName : options?.voice?.shortName) + textData.text)
            if (item.attrs?.voice) {
              data.options = item.attrs.voice
            }
            if (data.text.length > 1000) {
              data.textChunks = splitString(data.text)
            }
          }
          return data
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
      params = {
        type: 'OpenAI',
        model: options?.model,
        speed: data.speed,
        voice: options?.voice?.value,
        voiceLocalName: options?.voice?.label,
        data: jsonData?.map((item: any) => {
          const textData = item.content?.find((info: any) => info.type === 'text')
          const data: any = { text: '', md5: '' }
          if (textData) {
            data.text = textData.text.replace(/<br \/>/g, '');
            data.picture = item.attrs?.picture
            data.md5 = md5((item.attrs?.voice?.speed || data.speed) + 0 + item.attrs?.voice ? item.attrs?.voice.voiceLocalName : options?.voice?.value + textData.text)
            if (item.attrs?.voice) {
              data.options = item.attrs.voice
            }
            if (data.text.length > 1000) {
              data.textChunks = splitString(data.text)
            }
          }
          return data
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
      params = {
        type: 'Volc',
        emotion: options?.emotion?.value,
        voice_type: options?.voice?.value,
        voiceLocalName: options?.voice?.label,
        scene: options?.scenes,
        data: jsonData?.map((item: any) => {
          const textData = item.content?.find((info: any) => info.type === 'text')
          const data: any = { text: '', md5: '' }
          if (textData) {
            data.text = textData.text.replace(/<br \/>/g, '').replace(/\n/g, '');
            data.picture = item.attrs?.picture
            data.md5 = md5(data.speed + 0 + item.attrs?.voice ? item.attrs?.voice.voiceLocalName : options?.voice?.value + textData.text)
            if (item.attrs?.voice) {
              data.options = item.attrs.voice
            }
            if (data.text.length > 1000) {
              data.textChunks = splitString(data.text)
            }
          }
          return data
        })
      }
    }
    data.setGenerating(true)
    console.log(params)
    const result = await window.AIM.tts.mergeTemo(cloneDeep(params), data.uuid, { editorData: cloneDeep(data.editorData), bgm: cloneDeep(data.bgm), type: this.TTSType, ttsOptions: cloneDeep({ service: data.service, speed: data.speed, target: data.target, ttsOptions: options }) });
    // if (!result) {
    //     toast({
    //         variant: "destructive",
    //         description: i18n.t('tts.synthesis fail')
    //     })
    // }
    console.log(result)
    data.setGenerating(false)
    return result
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
        this.currentTTSProgress = msg.data.percent
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
