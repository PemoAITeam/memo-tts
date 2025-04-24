import "./App.scss"
import { useEffect, useState } from "react";
import { HashRouter } from "react-router-dom";
import { Toaster } from "@/app/components/ui/toaster";
import Routers from "@/app/routes/routes";
import stores from "./stores";
import { Provider } from "mobx-react";

const App = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    stores.dataStore?.initData().then(() => {
      setReady(true)
    })
    stores.settingStore?.initSetting().then(() => {
      // 注册监听
      console.log("注册监听");
      stores.appStore?.handleMessage();
      stores.pluginStore?.handlePluginMessage();
      stores.dataStore?.handleDataMessage();
      setReady(true);
    });

    return () => {
      stores.appStore?.removeHandler();
      stores.pluginStore?.removePluginHandler();
      stores.dataStore?.removeDataHandler();
      console.log("取消监听");
    }
  }, []);

  return (
    <div className={`bg-background text-foreground h-full ${window.AIM.isWindows ? " win" : window.AIM.isMac ? " mac" : ""}`}>
      <HashRouter>
        <Provider {...stores}>
          {ready && <Routers />}
        </Provider>
      </HashRouter>
      <Toaster />
    </div>
  );
}

export default App;
