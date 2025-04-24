import { createRoot } from 'react-dom/client'
import { Bridge } from '@memo/iframe-ipc';
import App from './App'
import './globals.scss'

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


createRoot(document.getElementById('root')!).render(<App />)

postMessage({ payload: 'removeLoading' }, '*')