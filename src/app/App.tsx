import "./App.scss"
import { inject, observer } from "mobx-react";
import { useEffect, useState } from "react";
import { HashRouter } from "react-router-dom";
import SettingStore from "@/app/stores/settingStore";
import DataStore from "@/app/stores/dataStore";
import { Toaster } from "@/app/components/ui/toaster";
import Routers from "@/app/routes/routes";
import stores from "./stores";

interface AppProps {
  settingStore?: SettingStore
  dataStore?: DataStore
}

const App = inject('settingStore', 'dataStore')(observer(({ settingStore, dataStore }: AppProps) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    dataStore?.initData().then(() => {
      setReady(true)
    })
    settingStore?.initSetting().then(() => {
      // 注册监听
      console.log("注册监听");
      stores.appStore?.handleMessage();
      stores.pluginStore?.handlePluginMessage();
      setReady(true);
    });

  }, [dataStore, settingStore]);

  return (
    <div
      className={`bg-background text-foreground h-full ${window.AIM.isWindows ? " win" : window.AIM.isMac ? " mac" : ""
        }`}
    >
      <HashRouter>
        {ready && <Routers />}
      </HashRouter>
      <Toaster />
    </div>
  );
}))

export default App;
