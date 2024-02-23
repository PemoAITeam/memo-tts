import { EditorData, TemoData } from '@/interface';
import { getSpeed, secondsToHMS } from '@/lib/utils';
import { cloneDeep } from 'lodash-es';
import md5 from 'md5';
import { makeAutoObservable, runInAction } from 'mobx'
import { makePersistable } from 'mobx-persist-store'
import { settingStore } from '.';
import { toast } from '@/components/ui/use-toast';


class DataStore {
    constructor() {
        makeAutoObservable(this)
        makePersistable(this, {
            name: 'dataStore',
            properties: [
                'temoData',
                'editorData',
            ],
        });
    }

    temoData: TemoData[] = []

    editorData: { type: 'doc', content: EditorData } | string = ''

    setTemoData = (data: TemoData) => {
        // const index = this.temoData.findIndex(item => item.uuid === data.uuid)
        // if (index > -1) {
        //     this.temoData[index].editorData = editorData
        //     this.temoData[index].data.unshift(data)
        // }
        this.temoData.unshift(data)
    }

    setEditorData = (data: any) => {
        this.editorData = data;
        localStorage.setItem('temo-editor', JSON.stringify(data))
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

    mergeTemo = async (data: { service: 'Edge' | 'OpenAI' | 'Volcano', speed: string, jsonData: any, uuid: string, editorData: any }, options: any) => {
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
                data: data.jsonData?.map((item: any) => {
                    const textData = item.content?.find((info: any) => info.type === 'text')
                    const data: any = { text: '', md5: '' }
                    if (textData) {
                        data.text = textData.text;
                        data.md5 = md5(rate + 0 + (item.attrs?.voice) ? (item.attrs?.voice.voiceLocalName) : options?.voice?.shortName + textData.text)
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
                    description: `请前往设置页配置ApiKey`
                })
                return
            }
            params = {
                type: 'OpenAI',
                model: options?.model,
                speed: data.speed,
                voice: options?.voice?.value,
                voiceLocalName: options?.voice?.label,
                data: data.jsonData?.map((item: any) => {
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
                    description: `请前往设置页配置AccessToken`
                })
                return
            }
            params = {
                type: 'Volc',
                emotion: options?.emotion,
                voice_type: options?.voice?.value,
                voiceLocalName: options?.voice?.label,
                scene: options?.scenes,
                data: data.jsonData?.map((item: any) => {
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
        console.log(params)
        const result = await window.AIM.mergeTemo(cloneDeep(params), data.uuid, cloneDeep(data.editorData));
        if (!result) {
            toast({
                variant: "destructive",
                description: `合成语音失败，请重试`
            })
        }
        return result
    }

}

export default DataStore
