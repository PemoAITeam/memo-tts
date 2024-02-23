import { EditorData, TemoData } from '@/interface';
import { getSpeed, secondsToHMS } from '@/lib/utils';
import { cloneDeep } from 'lodash-es';
import md5 from 'md5';
import { makeAutoObservable, runInAction } from 'mobx'
import { makePersistable } from 'mobx-persist-store'


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
            if(!isDelete) {
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
        return result
    }

}

export default DataStore
