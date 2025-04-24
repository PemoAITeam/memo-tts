import { customEvents, eventBus } from '@/events/eventBus';
import { IpcRendererEvent } from "electron";
import { makeAutoObservable } from 'mobx'
import { makePersistable } from 'mobx-persist-store'

class AppStore {

  temoId = '';

  constructor() {
    makeAutoObservable(this);
    makePersistable(this, {
      name: 'appStore',
      properties: [
        'temoId',
      ],
    });
  }

  setTemoId = (id: string) => {
    this.temoId = id
  }
  handleConvertProgress = async (
    event: IpcRendererEvent,
    msg: any,
  ) => {
    eventBus.emit(customEvents.RendererMessage, {
      event,
      ipcData: msg,
    });
  };
  handleMessage = () => {
    window.AIM.handleMessage(this.handleConvertProgress, "TemoApp");
  };

  removeHandler = () => {
    window.AIM.removeHandler("TemoApp");
  }
}

export default AppStore;