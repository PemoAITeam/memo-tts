import { createRoot } from 'react-dom/client'
import { Bridge } from '@memo/iframe-ipc';
import App from './App'
import './globals.scss'

if (!window.AIM) {
  window.AIM = new Bridge({
    methods: [
      "getSetting",
      "openDialog",
      "translateContent",
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
  }) || {}
}


createRoot(document.getElementById('root')!).render(<App />)

postMessage({ payload: 'removeLoading' }, '*')
