import AppStore from "./appStore";
import DataStore from "./dataStore";
import SettingStore from "./settingStore";
import PluginStore from "./pluginStore";
import { configurePersistable } from "mobx-persist-store";

// All properties are optional
configurePersistable(
    {
        storage: window.localStorage,
        expireIn: 86400000,
        removeOnExpiration: true,
        stringify: true,
        // debugMode: true,
    },
    { delay: 200, fireImmediately: false },
);

export const settingStore = new SettingStore();
export const pluginStore = new PluginStore(); // 依赖了 settingStore ，需要放在 settingStore 之后
export const dataStore = new DataStore();
const appStore = new AppStore();

export default {
    appStore,
    settingStore,
    pluginStore,
    dataStore,
}