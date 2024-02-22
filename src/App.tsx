import { inject, observer } from "mobx-react";
import { useEffect, useState } from "react";
import { HashRouter } from "react-router-dom";
import SettingStore from "@/stores/settingStore";
import DataStore from "@/stores/dataStore";
import { Toaster } from "@/components/ui/toaster";
import Routers from "@/routes/routes";

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
    settingStore?.initSetting()

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
