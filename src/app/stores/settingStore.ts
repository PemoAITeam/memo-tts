
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { makeAutoObservable, runInAction } from 'mobx'
import { makePersistable } from 'mobx-persist-store'

import { fallbackLanguage, localesResources } from '@/app/locales'
import { AppSettings } from '@/app/interface'
import { SettingChange } from '@/app/types'

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
  i18nInit = false

  initSetting = async () => {
    const settings = await window.AIM.getSetting()
    runInAction(() => {
      this.settings = settings
      console.log(this.settings)
    })
    const defaultLang = settings.language || fallbackLanguage;
    await i18n
      .use(initReactI18next) // passes i18n down to react-i18next
      .init({
        // the translations
        // (tip move them in a JSON file and import them,
        // or even better, manage them via a UI: https://react.i18next.com/guides/multiple-translation-files#manage-your-translations-with-a-management-gui)
        resources: localesResources,
        lng: defaultLang, // if you're using a language detector, do not define the lng option
        fallbackLng: fallbackLanguage,
        interpolation: {
          escapeValue: false // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
        }
      }, () => {
        this.i18nInit = true
      });
  }

  handleMessage = async (e: any) => {
    if (e && e.ipcData) {
      const msg = e.ipcData as SettingChange
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
}

export default SettingStore
