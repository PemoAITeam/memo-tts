# memo-tts Electron Host Adapter

## Status

This document was originally written when the real Electron host repository was
not yet available in the current workspace context.

That assumption is now outdated.

Current source-of-truth split:

- renderer/frontend state: `F:\Develop\memo-tts`
- real Electron host implementation: `F:\Develop\electron-react`
- plugin manager / plugin package reference: `F:\Develop\MemoAITranslate`

For the current host-side implementation notes, prefer:

- `F:\Develop\electron-react\docs\memo-tts-plugin-host.md`

For the latest renderer/host acceptance snapshot in this repo, see:

- `docs/refactor-acceptance-matrix.md`
- `docs/plugin-editor-options-source-of-truth.md`

## Purpose

This document translates the current `memo-tts` renderer refactor into a
concrete Electron host implementation plan, using the existing
`MemoAITranslate` plugin manager and TTS plugin layout as the reference, and
mapping that plan onto the real Electron host in `F:\Develop\electron-react`.

Target result:

- `memo-tts` renderer remains plugin-only
- Electron host resolves TTS execution by `pluginId`
- renderer preview and merge both run through the same plugin manager contract
- TipTap editor menus can request dynamic field options for plugin-backed custom
  components

## Repository Boundary

The `MemoAITranslate` repository in `F:\Develop\MemoAITranslate` contains:

- the shared plugin manager
- TTS plugin packages
- plugin manifests and component sources

It does **not** contain the actual Electron preload / IPC / main-process host
entrypoints that open `memo-tts`.

The real host wiring lives in:

- `F:\Develop\electron-react\electron\main\handlers\tts.ts`
- `F:\Develop\electron-react\electron\main\handlers\ttsPluginEditorOptions.ts`
- `F:\Develop\electron-react\electron\preload\bridge\tts.ts`

Practical consequence:

- `MemoAITranslate` should be treated as a contract/reference source
- `electron-react` should be treated as the real host integration target
- the bridge is no longer purely "planned"; a large part of it has already been
  implemented in `electron-react`
- the remaining work is mainly verification, cleanup, and any follow-up gaps
  discovered during runtime QA

## Reference Files In MemoAITranslate

Plugin manager and metadata:

- `F:\Develop\MemoAITranslate\manager\src\index.ts`
- `F:\Develop\MemoAITranslate\manager\src\types.ts`

Base TTS plugin contract:

- `F:\Develop\MemoAITranslate\core\lib\interface\tts.ts`

TTS plugin implementations:

- `F:\Develop\MemoAITranslate\plugins\tts\edge\lib\index.ts`
- `F:\Develop\MemoAITranslate\plugins\tts\openai\lib\index.ts`
- `F:\Develop\MemoAITranslate\plugins\tts\volctrans\lib\index.ts`
- `F:\Develop\MemoAITranslate\plugins\tts\azure\lib\index.ts`
- `F:\Develop\MemoAITranslate\plugins\tts\elevenlabs\lib\index.ts`

Dynamic option sources:

- `F:\Develop\MemoAITranslate\plugins\tts\edge\lib\edge\edge-voices.ts`
- `F:\Develop\MemoAITranslate\plugins\tts\edge\components\src\lib\components\Speaker.tsx`
- `F:\Develop\MemoAITranslate\plugins\tts\volctrans\components\src\lib\components\Scene.tsx`
- `F:\Develop\MemoAITranslate\plugins\tts\volctrans\components\src\lib\components\VoiceType.tsx`
- `F:\Develop\MemoAITranslate\plugins\tts\volctrans\components\src\lib\components\Emotion.tsx`
- `F:\Develop\MemoAITranslate\plugins\tts\elevenlabs\components\src\lib\components\voices.ts`
- `F:\Develop\MemoAITranslate\plugins\tts\azure\components\src\lib\components\Speaker.tsx`

## Renderer Calls That The Host Must Support

The current renderer now depends on these host APIs:

- `window.AIM.plugin.readLocalPlugins()`
- `window.AIM.plugin.saveConfiguration(pluginId, formData)`
- `window.AIM.tts.synthesize({ provider, pluginId, text, options, returnBuffer })`
- `window.AIM.tts.getPluginEditorOptions({ provider, pluginId, fieldKey, role, scope, config, query })`
- `window.AIM.tts.mergeTemo(payload, uuid, extra)`

Optional/compatibility surface:

- `window.AIM.plugin.getProviders("tts")`

Note:

- the current renderer main flow derives TTS providers from
  `readLocalPlugins()`
- `plugin.getProviders("tts")` is typed in the bridge surface, but it is not
  the primary dependency for the current provider-selection flow

## Renderer Payload Contracts

### Preview Synthesis

```ts
{
  provider: "Edge TTS",
  pluginId: "memo-plugin-tts-edge",
  text: "Welcome to memo",
  options: {
    language: "EN_US",
    voiceName: "en-US-JennyNeural",
    rate: 20
  },
  returnBuffer: true
}
```

### Merge Payload

```ts
{
  mode: "plugin",
  provider: "OpenAI TTS",
  pluginId: "memo-plugin-tts-openai",
  data: [
    {
      text: "hello world",
      md5: "...",
      options: {
        model: "tts-1",
        voice: "alloy",
        speed: 1
      }
    }
  ]
}
```

### Dynamic Editor Option Request

```ts
{
  provider: "Volcengine TTS",
  pluginId: "memo-plugin-tts-volcengine",
  fieldKey: "emotion",
  role: "emotion",
  scope: "segment",
  config: {
    scene: "video",
    voiceType: "BV412_streaming"
  },
  query: ""
}
```

Expected response:

```ts
[
  { value: "happy", label: "Happy" },
  { value: "sad", label: "Sad" }
]
```

## Host Implementation Plan

Status note:

- the preload/main-process bridge items below are no longer hypothetical only
- the main plugin preview path, plugin merge path, and dynamic editor option
  path have already been wired in `F:\Develop\electron-react`
- this section remains useful as the design contract behind those changes

### 1. Preload / bridge

Expose the new renderer methods through Electron preload:

- `plugin.readLocalPlugins`
- `plugin.getProviders`
- `plugin.saveConfiguration`
- `tts.synthesize`
- `tts.getPluginEditorOptions`
- `tts.mergeTemo`

If the host already exposes `plugin.readLocalPlugins()` and
`plugin.saveConfiguration()`, only the three TTS methods need new wiring.

### 2. Shared host helper: resolve plugin context

Recommended shared helper:

```ts
async function resolveTTSPluginContext(pluginId: string, provider?: string) {
  const data = pluginManager.getAllData()
  const manifest = data.installedPluginsManifests[pluginId]
  const pluginModule = pluginManager.loadPlugin(pluginId)
  const plugin = new pluginModule.default()
  const version = data.installedPlugins[pluginId]?.version
  const storedConfig = version
    ? data.pluginsConfigurations[`${pluginId}@${version}`] || {}
    : {}

  return {
    manifest,
    plugin,
    storedConfig,
    provider: provider || manifest?.provider?.value,
  }
}
```

### 3. Shared host helper: build runtime TTS options

Renderer `options` now only contains runtime editor-facing fields. The host must
merge them with stored plugin configuration and defaults before calling
`textToSpeech(...)`.

Recommended merge order:

`manifest.defaultsConfiguration -> stored plugin config -> renderer runtime options -> host-added fields`

Recommended helper:

```ts
function buildTTSRuntimeOptions(args: {
  manifest: Manifest
  storedConfig: Record<string, any>
  runtimeOptions?: Record<string, any>
  text: string
  uuid?: string
  fetchOptions?: Record<string, any>
}) {
  const { manifest, storedConfig, runtimeOptions, text, uuid, fetchOptions } = args

  return {
    ...(manifest.defaultsConfiguration || {}),
    ...(storedConfig || {}),
    ...(runtimeOptions || {}),
    text,
    uuid,
    fetchOptions,
  }
}
```

### 4. Implement `tts.synthesize(...)`

Recommended behavior:

1. resolve plugin context by `pluginId`
2. merge stored config with runtime `options`
3. call `plugin.textToSpeech(...)`
4. normalize return value into `{ success, data, message }`

Recommended result normalization:

- `Buffer` => `{ success: true, data: buffer }`
- `string` non-empty error => `{ success: false, message: errorString }`

### 5. Implement `tts.mergeTemo(...)`

Current renderer assumption:

- host accepts the generic plugin payload
- host loops `payload.data`
- each item becomes one plugin `textToSpeech(...)` call
- host keeps existing memo-temo progress, file merge, persistence, and history
  update behavior

Recommended adaptation:

1. resolve plugin context once from `payload.pluginId`
2. for each `payload.data[i]`
   - split by `textChunks` if present
   - call `plugin.textToSpeech(...)` for each chunk or item
   - preserve existing progress events: `temo:audio:start`, `temo:audio:progress`,
     `temo:audio:end`, `temo:audio:error`, `temo:audio:abort`
3. continue using the host's existing audio merge/history persistence flow
4. return persisted `TemoData` with normalized plugin-native `ttsOptions`

Important:

- do not branch by `Edge`, `OpenAI`, or `Volcano` anymore
- branch only by `pluginId` when plugin-specific handling is truly unavoidable

## Dynamic Editor Option Sources

The renderer now supports async option loading for editor controls. The host can
serve those options by plugin id and field key.

Important boundary rule:

- if the option table is plugin-owned, the host should delegate to the plugin
  instead of hardcoding that table inside `electron-react`
- the current Volcengine plugin is the main example of this rule
- detailed analysis and the recommended cross-repo fix are documented in
  `docs/plugin-editor-options-source-of-truth.md`

### Edge TTS

Plugin id:

- `memo-plugin-tts-edge`

Suggested field support:

- `language`
  - manifest already has static options
  - host dynamic options not required
- `voiceName`
  - source: `F:\Develop\MemoAITranslate\plugins\tts\edge\lib\edge\edge-voices.ts`
  - filter by `config.language`
  - map:
    - `value = voice.shortName`
    - `label = voice.properties.LocalName || voice.shortName`

### OpenAI TTS

Plugin id:

- `memo-plugin-tts-openai`

Suggested field support:

- none required for editor menus right now
- manifest already provides static `model`, `voice`, and `speed`

### Volcengine TTS

Plugin id:

- `memo-plugin-tts-volcengine`

Correct support strategy:

- `scene`
- `voiceType`
- `emotion`

These fields should not remain host-hardcoded.

Instead:

- the option tables should live in the Volcengine plugin package
- the plugin should export a callable `getEditorOptions(...)` API
- the host should load the plugin module and forward the request

### ElevenLabs TTS

Plugin id:

- `memo-plugin-tts-elevenlabs`

Suggested field support:

- `voiceId`
  - source: `F:\Develop\MemoAITranslate\plugins\tts\elevenlabs\components\src\lib\components\voices.ts`
  - map:
    - `value = voice.voice_id`
    - `label = voice.name`

### Azure TTS

Plugin id:

- `memo-plugin-tts-azure`

Suggested field support:

- `language`
  - static options exist in the component
- `voiceName`
  - source logic: `F:\Develop\MemoAITranslate\plugins\tts\azure\components\src\lib\components\Speaker.tsx`
  - fetch from:
    - `GET https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`
  - auth:
    - `Ocp-Apim-Subscription-Key: resourceKey`
  - filter by `config.language`
  - requires stored config `region` + `resourceKey`

## Suggested `getPluginEditorOptions(...)` Shape

Recommended host switch:

```ts
async function getPluginEditorOptions(request: TTSProviderFieldOptionRequest) {
  switch (request.pluginId) {
    case "memo-plugin-tts-edge":
      return getEdgeFieldOptions(request)
    case "memo-plugin-tts-volcengine":
      return getVolcengineFieldOptions(request)
    case "memo-plugin-tts-elevenlabs":
      return getElevenLabsFieldOptions(request)
    case "memo-plugin-tts-azure":
      return getAzureFieldOptions(request)
    default:
      return []
  }
}
```

Recommended normalization helper:

```ts
function normalizeOptions(items: Array<{ value: string | number; label: string }>) {
  return items.map((item) => ({
    value: item.value,
    label: item.label,
  }))
}
```

## Practical Notes

- `memo-tts` renderer now already handles async menu loading and fallback states.
- if host returns `[]`, the renderer falls back to static options or current
  runtime value.
- if host does not implement `getPluginEditorOptions(...)`, the main plugin form
  still works, but editor `@voice` and segment controls will be incomplete for
  custom-component-backed fields.
- legacy built-in records are already blocked from synthesis until they are
  rebound to a real plugin voice.

## Remaining Host Work

Most of the original migration order below is already complete in
`F:\Develop\electron-react`.

Current remaining work is:

1. run end-to-end verification with the real Electron host and current
   `memo-tts` bundle
2. verify history persistence returns normalized plugin-native `ttsOptions`
3. keep the legacy built-in host branch only as long as older callers still
   require it
4. keep this document synchronized with
   `F:\Develop\electron-react\docs\memo-tts-plugin-host.md`
