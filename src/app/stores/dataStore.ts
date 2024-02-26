import { EditorData, TemoData } from '@/app/interface';
import { getSpeed, secondsToHMS } from '@/app/lib/utils';
import { cloneDeep } from 'lodash-es';
import md5 from 'md5';
import { makeAutoObservable, runInAction } from 'mobx'
import { makePersistable } from 'mobx-persist-store'
import { settingStore } from '.';
import { toast } from '@/app/components/ui/use-toast';
import i18n from 'i18next'

class DataStore {
    constructor() {
        makeAutoObservable(this)
        makePersistable(this, {
            name: 'dataStore',
            properties: [
                'temoData',
                'editorData',
                'trashData'
            ],
        });
    }

    temoData: TemoData[] = []

    editorData: { type: 'doc', content: EditorData } | string = ''

    trashData: TemoData[] = []



    setTemoData = (data: TemoData) => {
        this.temoData.unshift(data)
    }

    setEditorData = (data: any) => {
        this.editorData = data;
        localStorage.setItem('temo-editor', JSON.stringify(data))
    }

    setTrashData = (data: TemoData[]) => {
        this.trashData = data.concat(this.trashData)
        window.AIM.saveTemoTrash(cloneDeep(this.trashData))
        data.forEach(info => {
            const index = this.temoData.findIndex(item => item.uuid === info.uuid)
            if (index > -1) {
                const newData = cloneDeep(this.temoData)
                newData.splice(index, 1)
                this.temoData = newData
            }
        })
        window.AIM.updateTemoData(cloneDeep(this.temoData))
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
                window.AIM.updateTemoData(cloneDeep(this.temoData))
            }
            window.AIM.saveTemoTrash(cloneDeep(this.trashData), isDelete ? data.map(item => item.uuid) : null)
        }
    }

    getTrashData = async () => {
        const trashData = await window.AIM.getTemoTrash() || []
        runInAction(() => {
            this.trashData = trashData
        })
        return trashData
    }

    initData = async () => {
        let temoData = await window.AIM.getTemoData() || []
        if (temoData?.length) {
            console.log(temoData)
            temoData = temoData.map((item: any) => ({ ...item, duration: secondsToHMS(item.metadata?.duration) }))
        }
        const editorData = localStorage.getItem('temo-editor') || ""
        runInAction(() => {
            this.temoData = temoData
            this.editorData = editorData ? JSON.parse(editorData) : ''
        })
    }

    mergeTemo = async (data: { service: 'Edge' | 'OpenAI' | 'Volcano', target: string, speed: string, uuid: string, editorData: any, setJenerating: (params: boolean) => void }, options: any) => {
        const editorContent = data.editorData.content;
        if (editorContent?.length) {
            editorContent.forEach((item: { type: string; attrs: { voice: any; }; }, index: number) => {
                if (item.type == 'editorCard' && editorContent[index + 1]?.type == 'translateCard') {
                    if (item.attrs?.voice) {
                        editorContent[index + 1].attrs!.voice = item.attrs.voice
                    } else {
                        delete editorContent[index + 1].attrs!.voice
                    }
                }
            })
        }
        console.log(editorContent)
        const jsonData = data.target === 'original' ? editorContent?.filter((item: { content: string | any[]; type: string; }) => !!item.content?.length && item.content[0].text && item.type === 'editorCard')
            : editorContent?.filter((item: { content: string | any[]; type: string; }) => !!item.content?.length && item.content[0].text && item.type === 'translateCard')
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
                        data.text = textData.text;
                        data.md5 = md5(rate + 0 + (item.attrs?.voice ? item.attrs?.voice.voiceLocalName : options?.voice?.shortName) + textData.text)
                        if (item.attrs?.voice) {
                            data.options = item.attrs.voice
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
                        data.text = textData.text;
                        data.md5 = md5(data.speed + 0 + item.attrs?.voice ? item.attrs?.voice.voiceLocalName : options?.voice?.value + textData.text)
                        if (item.attrs?.voice) {
                            data.options = item.attrs.voice
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
                emotion: options?.emotion,
                voice_type: options?.voice?.value,
                voiceLocalName: options?.voice?.label,
                scene: options?.scenes,
                data: jsonData?.map((item: any) => {
                    const textData = item.content?.find((info: any) => info.type === 'text')
                    const data: any = { text: '', md5: '' }
                    if (textData) {
                        data.text = textData.text;
                        data.md5 = md5(data.speed + 0 + item.attrs?.voice ? item.attrs?.voice.voiceLocalName : options?.voice?.value + textData.text)
                        if (item.attrs?.voice) {
                            data.options = item.attrs.voice
                        }
                    }
                    return data
                })
            }
        }
        data.setJenerating(true)
        console.log(params)
        const result = await window.AIM.mergeTemo(cloneDeep(params), data.uuid, cloneDeep(data.editorData));
        if (!result) {
            toast({
                variant: "destructive",
                description: i18n.t('tts.synthesis fail')
            })
        }
        data.setJenerating(false)
        return result
    }

}

export default DataStore
