import { createRoot } from 'react-dom/client'
import { Bridge } from '@aim-packages/iframe-ipc';
import App from './App'
import './globals.scss'

if (!window.AIM) {
  window.AIM = new Bridge({
    methods: [
      "getSetting",
      "openDialog",
      "plugin.readLocalPlugins",
      "plugin.saveConfiguration",
      "plugin.getProviders",
      "tts.getTemoData",
      "tts.updateTemoData",
      "tts.deleteTemoData",
      "tts.getTemoLibrary",
      "tts.saveTemoLibrary",
      "tts.copyTemoFile",
      "tts.mergeTemo",
      "tts.abortMergeTemo",
      "tts.getTemoAudition",
      "tts.synthesize",
      "tts.getPluginEditorOptions",
      "tts.renderMedia",
      "tts.temoDownload"
    ],
    appId: "memo-plugin-app-tts",
  }) as unknown as Window["AIM"] || {}
}


createRoot(document.getElementById('root')!).render(<App />)

postMessage({ payload: 'removeLoading' }, '*')
