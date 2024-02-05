import { TemoData } from '@/interface';
import { secondsToHMS } from '@/lib/utils';
import { makeAutoObservable, runInAction } from 'mobx'
import { makePersistable } from 'mobx-persist-store'


class DataStore {
    constructor() {
        makeAutoObservable(this)
        makePersistable(this, {
            name: 'dataStore',
            properties: [
                'temoData',
            ],
        });
    }

    temoData: TemoData[] = []

    initData = async () => {
        let temoData = await window.AIM.getTemoData()
        if (temoData?.length) {
            console.log(temoData)
            temoData = temoData.map((item: any) => ({ ...item, duration: secondsToHMS(item.metadata?.duration) }))
        }
        runInAction(() => {
            this.temoData = temoData
        })
    }

}

export default DataStore
