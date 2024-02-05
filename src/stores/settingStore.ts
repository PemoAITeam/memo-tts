
import i18n from 'i18next'
import { makeAutoObservable, runInAction } from 'mobx'
import { makePersistable } from 'mobx-persist-store'

import { localesResources } from '@/locales'
import { AppSettings } from '@/interface'
import { SettingChange } from '@/types'

class SettingStore {
  constructor() {
    makeAutoObservable(this)
    makePersistable(this, {
      name: 'settingStore',
      properties: [
        'settings',
      ],
    });
  }

  settings: AppSettings = {}

  initSetting = async () => {
    const settings = await window.AIM.getSetting()
    runInAction(() => {
      this.settings = settings
      console.log(this.settings)
    })
  }

  handleMessage = async (e: any) => {
    if (e && e.icpData) {
      const msg = e.icpData as SettingChange
      if (msg.type === 'setting:change') {
        this.settings = msg.data
      }
    }
  };

  // 增加翻译（如果键不存在）
  addTranslationIfNotExists = (languageCode: keyof typeof localesResources, key: string, translation: any) => {
    // if (!i18n.getResource(languageCode, 'translation', key)) {
    i18n.addResource(languageCode, 'translation', key, translation);
    // }
  };

  // handleChangeSettingMessage = () => {
  //   eventBus.on(customEvents.RendererMessage, this.handleMessage)
  // }

  // removeChangeSettingHandler = () => {
  //   eventBus.off(customEvents.RendererMessage, this.handleMessage)
  // }

  hideBar = false
  setHideBar = (val: boolean) => {
    this.hideBar = val
  }
  showPanel = false
  setShowPanel = (val: boolean) => {
    this.showPanel = val
  }

  changeTheme = (value: 'system' | 'light' | 'dark') => {
    window.AIM.changeTheme(value)
  }
}

export default SettingStore
