import { Provider } from 'mobx-react';
import { createRoot } from 'react-dom/client'
import { Bridge } from '@memo/iframe-ipc';
import App from './App'
import './globals.scss'
import stores from './stores';

if (!window.AIM) {
  window.AIM = new Bridge({
    methods: [
      "getSetting",
      "saveTemoTrash",
      "updateTemoData",
      "getTemoData",
      "getTemoTrash",
      "saveTemoLibrary",
      "mergeTemo",
      "temoDownload",
      "openDialog",
      "renderMedia",
      "getTemoAudition",
      "translateContent"
    ],
    appId: "memo-plugin-app-tts",
  }) || {}
}


createRoot(document.getElementById('root')!).render(
  <Provider {...stores}>
    <App />
  </Provider>,
)

postMessage({ payload: 'removeLoading' }, '*')