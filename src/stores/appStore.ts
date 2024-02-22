import { makeAutoObservable } from 'mobx'
import { makePersistable } from 'mobx-persist-store'

class AppStore {
    
    hideBar = false;
    temoId = '';

    constructor() {
        makeAutoObservable(this);
        makePersistable(this, {
            name: 'appStore',
            properties: [
                'hideBar',
                'temoId',
            ],
        });
    }



    setHideBar = () => {
        this.hideBar = !this.hideBar
    }

    setTemoId = (id: string) => {
        this.temoId = id
    }
}

export default AppStore;