import AppStore from "./appStore";
import DataStore from "./dataStore";
import SettingStore from "./settingStore";
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
export const dataStore = new DataStore();
const appStore = new AppStore();

export default {
    settingStore,
    dataStore,
    appStore
}