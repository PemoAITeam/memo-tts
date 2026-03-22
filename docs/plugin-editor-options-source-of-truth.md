# Plugin Editor Options Source of Truth

## Why this document exists

The current `memo-tts` renderer already supports plugin-driven editor options:

- global form rendering from plugin manifests
- async option loading through `window.AIM.tts.getPluginEditorOptions(...)`
- plugin i18n registration into the renderer i18next tree

But one important boundary is still wrong for the Volcengine TTS plugin:

- the right-side form renderer shows plugin-owned labels because the plugin
  custom components own their own option tables
- the TipTap `@voice` menu shows host-provided labels because it asks the
  Electron host for dynamic options
- the Electron host currently hardcodes Volcengine `scene / voiceType /
  emotion` tables inside
  `F:\Develop\electron-react\electron\main\handlers\ttsPluginEditorOptions.ts`

That means the renderer is no longer the main problem. The remaining mismatch is
the source of truth for plugin option data.

## Correct ownership

The correct ownership split is:

- `memo-tts`
  - requests plugin editor options
  - renders whatever the plugin exposes
  - translates plugin-owned option keys through plugin i18n
- `electron-react`
  - loads the plugin package
  - forwards option requests to the plugin
  - does not hardcode plugin-owned option tables
- `MemoAITranslate`
  - owns the actual option tables for the plugin
  - owns the i18n keys and translations for those option labels
  - exports a plugin API that the host can call

In short:

- plugin content stays in the plugin
- host is a bridge, not a second source of truth

## What is happening today

### Renderer side

`memo-tts` already does the right high-level thing:

- `src/app/lib/tts-plugin.ts`
  - asks `window.AIM.tts.getPluginEditorOptions(...)` when a field has no static
    manifest options
- `src/app/lib/plugin-i18n.ts`
  - registers plugin i18n bundles and translates plugin labels
- `src/app/lib/tts-mention/data.ts`
  - uses async field option loading for the TipTap `@voice` menu
- `src/app/lib/tts-mention/use-tts-bubble-menu.ts`
  - uses async field option loading for segment-level controls

So the renderer path is already prepared for plugin-owned editor options.

### Host side

`electron-react` currently mixes two strategies:

- correct:
  - Edge, Azure, and some remote-backed cases are host-assisted because the
    option source is external or runtime-derived
- incorrect:
  - Volcengine `scene / voiceType / emotion` are hardcoded in
    `ttsPluginEditorOptions.ts`

That Volcengine branch duplicates plugin data in the host.

### Plugin side

`MemoAITranslate/plugins/tts/volctrans` currently has:

- `lib/manifest.json`
  - declares custom component fields
- `lib/i18n.json`
  - only includes field labels and placeholders
- `components/src/lib/components/Scene.tsx`
  - owns a local scene option table
- `components/src/lib/components/VoiceType.tsx`
  - owns a local voice table
- `components/src/lib/components/Emotion.tsx`
  - owns a local emotion table

So the plugin already owns the real data, but it only exposes that data to its
form renderer components, not to the Electron host.

## Reference design inside MemoAITranslate

The best existing pattern in `MemoAITranslate` is the Edge plugin component
design:

- component options use plugin-scoped translation keys
- UI calls `_t(...)` with the plugin language prefix
- plugin i18n is the source of visible text

Volcengine should move toward the same model:

- option tables should use stable label keys, not host-owned labels
- plugin `i18n.json` should translate those keys
- both form renderer and editor menus should consume the same keys

## Recommended final design

### Rule 1: the plugin exports editor options

Add a plugin export such as:

```ts
export function getEditorOptions(request: {
  fieldKey?: string
  role?: string
  scope?: string
  config?: Record<string, any>
  query?: string
}) {
  return [{ value, label }]
}
```

The important part is:

- `value` is the runtime value
- `label` is a plugin-owned i18n key or plugin-owned display token

### Rule 2: the plugin owns translation keys

Volcengine option tables should move to shared plugin data such as:

```ts
{ value: "common", label: "scene.common" }
{ value: "BV700_V2_streaming", label: "voice.BV700_V2_streaming" }
{ value: "happy", label: "emotion.happy" }
```

And `i18n.json` should provide the visible translations.

That lets both UI surfaces use the same source:

- form renderer component: `_t(label)`
- `memo-tts` editor menu: `translatePluginOptionLabel(pluginId, label)`

### Rule 3: the host forwards instead of owning

`electron-react/electron/main/handlers/ttsPluginEditorOptions.ts` should:

1. resolve the plugin by `pluginId`
2. load the plugin module from the plugin manager
3. if the plugin exports `getEditorOptions`, call it
4. normalize and return the result
5. only fall back to host-owned logic for cases that are truly host/runtime
   driven

That means:

- keep host logic for Azure voice fetch if needed
- keep host logic for Edge if the plugin does not export its own voice query API
- remove the Volcengine hardcoded option tables from the host

## File-by-file change list

### `F:\Develop\MemoAITranslate\plugins\tts\volctrans\lib\index.ts`

Change:

- export `getEditorOptions(...)`

Why:

- lets the Electron host ask the plugin for `scene / voiceType / emotion`
  options

### `F:\Develop\MemoAITranslate\plugins\tts\volctrans\lib\editor-options.ts`

Recommended new file.

Change:

- move Volcengine scene / voice / emotion tables here
- use plugin-owned label keys instead of visible text literals
- expose lookup helpers for:
  - scene options
  - voice options by scene
  - emotion options by voice type

Why:

- gives both plugin components and plugin host export one shared data source

### `F:\Develop\MemoAITranslate\plugins\tts\volctrans\lib\i18n.json`

Change:

- add translations for scene keys
- add translations for voice keys
- add translations for emotion keys

Why:

- makes both the form renderer and the `memo-tts` editor menu use the same
  multilingual labels

### `F:\Develop\MemoAITranslate\plugins\tts\volctrans\components\src\lib\components\Scene.tsx`

Change:

- read scene options from shared plugin data
- render `t(option.label)`

Why:

- prevents the component from being a second source of truth

### `F:\Develop\MemoAITranslate\plugins\tts\volctrans\components\src\lib\components\VoiceType.tsx`

Change:

- read voice options from shared plugin data
- render `t(option.label)`

Why:

- keeps right-side form rendering aligned with `@voice`

### `F:\Develop\MemoAITranslate\plugins\tts\volctrans\components\src\lib\components\Emotion.tsx`

Change:

- read emotion options from shared plugin data
- render `t(option.label)`

Why:

- keeps segment-related labels aligned with plugin i18n

### `F:\Develop\electron-react\electron\main\handlers\ttsPluginEditorOptions.ts`

Change:

- add a generic plugin delegation path:
  - `getPluginsManager().loadPlugin(pluginId)`
  - call `pluginModule.getEditorOptions(request)` when available
- remove Volcengine hardcoded `scene / voiceType / emotion` tables
- keep fallback logic only for non-plugin-owned cases

Why:

- the host should bridge plugin data, not duplicate it

## Why the old Volcengine host branch is not enough

Even if the host returns correct Chinese labels, that is still the wrong
architecture because:

- plugin data is duplicated in two repositories
- form renderer and `@voice` can drift apart
- plugin i18n cannot truly own those labels
- every plugin update would require host edits

So the issue is not only "translation is wrong".

The deeper issue is:

- the source of truth is in the wrong repository

## Packaging note

Editing `MemoAITranslate/plugins/tts/volctrans` source is not enough by itself.

`electron-react` runtime loads installed or packaged plugin artifacts:

- preset `.memox` packages under `F:\Develop\electron-react\resources\plugins`
- or installed plugins under the Memo user data plugin directory

So after the plugin source is fixed, one more step is required:

- rebuild/package the Volcengine plugin
- reinstall or refresh the actual plugin artifact used by `electron-react`

Otherwise the host will keep loading the old plugin build.

## Acceptance criteria

The change is only complete when all of the following are true:

- right-side plugin form and TipTap `@voice` menu use the same Volcengine
  option source
- Volcengine option text is owned by plugin i18n, not by the host
- `electron-react` no longer contains hardcoded Volcengine option tables
- changing plugin labels only requires a plugin update, not a host edit
- switching renderer language changes both the form renderer and `@voice`
  labels consistently

## Practical next step

The next implementation step should be:

1. refactor the Volcengine plugin in `MemoAITranslate` to export shared option
   metadata
2. change `electron-react` to delegate Volcengine option lookup to the plugin
3. rebuild/package/reinstall the plugin artifact
4. verify the `memo-tts` `@voice` menu and right-side form show the same labels

