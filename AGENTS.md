# memo-tts Agent Guide

## Project Identity

`memo-tts` is the TTS editor frontend used by the Memo/Temo desktop workflow.
Despite the stale `package.json` name (`realtime-recorder`) and the generic
`README.md`, this repository is not a starter template. It is a real React
application for:

- editing TTS script blocks with TipTap
- attaching per-block voice settings and per-segment speed/emotion marks
- translating script blocks before synthesis
- generating host-managed TTS records
- reviewing history and local media library assets
- exporting audio bundles or rendered video through the desktop host

Treat this file as the reliable project briefing. The current `README.md` is
template-era documentation and does not describe the real runtime.

## Stack

- React 18
- TypeScript
- Vite 5
- MobX + `mobx-persist-store`
- TipTap
- Tailwind + SCSS
- Radix UI
- `memo-plugin-manager`
- `@memo/iframe-ipc` for fallback bridge mode

Package manager: `pnpm`

## Useful Commands

- `pnpm dev`
  Starts Vite on `http://localhost:5175/`
- `pnpm build`
  Runs `tsc && vite build`
- `pnpm lint`
  Runs ESLint over `ts` and `tsx`
- `pnpm preview`
  Serves the built bundle locally

Important build details:

- `vite.config.ts` sets `base: './'`
- routing uses `HashRouter`

Those two choices are intentional because this app is often loaded from a local
file path inside Electron, not just from a web server.

## Runtime Modes

### 1. Normal desktop-hosted mode

This is the main production/runtime path.

- A sibling Electron app opens this frontend
- In that mode, `window.AIM` is injected by the Electron preload bridge
- Host APIs under `window.AIM`, `window.AIM.tts`, and `window.AIM.plugin` do the
  real work

Practical consequence:

changing code in this repo alone does not update the host's production TTS page
until the bundle is rebuilt and synced into the Electron host project.

### 2. Fallback iframe/web mode

`src/app/main.tsx` creates a `new Bridge(...)` from `@memo/iframe-ipc` only when
`window.AIM` does not already exist.

This path is best-effort only. The fallback bridge currently declares only a
subset of the methods the app now uses. For example, the app also calls host
APIs such as:

- `window.AIM.tts.getTemoLibrary`
- `window.AIM.tts.copyTemoFile`
- `window.AIM.tts.abortMergeTemo`
- `window.AIM.plugin.readLocalPlugins`
- `window.AIM.plugin.saveConfiguration`

Do not assume standalone iframe mode supports the whole feature set unless both
sides are updated together.

## Boot And Initialization

1. `src/app/stores/index.ts`
   Configures `mobx-persist-store` to use `window.localStorage` with a 24 hour
   expiration window, then instantiates `settingStore`, `pluginStore`,
   `dataStore`, and `appStore`.
2. `src/app/main.tsx`
   Creates fallback `window.AIM` when needed, mounts React, then posts
   `removeLoading`.
3. `src/app/App.tsx`
   Starts `dataStore.initData()` and `settingStore.initSetting()` in parallel,
   then registers app/plugin/data message listeners after settings init.
4. `src/app/routes/routes.tsx`
   Uses `HashRouter` and exposes `/home` and `/history/:id?`.
5. `src/app/pages/home/home.tsx`
   Drives the main authoring and synthesis flow.

Important nuance:

- `App.tsx` sets `ready` to `true` in both init promises. That means the router
  can render as soon as either data init or settings init completes. Do not
  assume i18n, plugin loading, and data hydration are fully synchronized.

## Core Data Model

### Editor document model

- The TipTap document is effectively a flat sequence of `editorCard` nodes with
  optional adjacent `translateCard` nodes.
- `editorCard` attributes hold the stable card `id` and optional card-level
  `voice` config.
- `translateCard` is usually inserted immediately after its source `editorCard`.
- `Tiptap` ensures at least one `editorCard` exists after edits or clear actions.
- Multi-line paste is intercepted by `paste-plugin.ts` and split into multiple
  `editorCard` blocks.
- Drag and drop import supports `.txt`, `.docx`, and `.md`.

### Block-level vs segment-level TTS controls

- Card-level voice overrides are attached to `editorCard.attrs.voice`.
- TipTap also includes `TTSMention` and `TTSBubbleMenu` support from
  `src/app/lib/tts-mention/`.
- Those inline marks are converted into text segments with per-segment `speed`
  and `emotion` by `extractTextSegmentsFromNode()` in `src/app/lib/utils.ts`.
- `dataStore.mergeTemo()` uses those extracted segments when it builds the final
  provider payload.

### Media and library model

- `dataStore.libraryData` stores imported media assets for reuse.
- `TTSDialog` is the library picker used for BGM selection.
- `copyLibraryFile()` delegates file copying to `window.AIM.tts.copyTemoFile`.

## Core Flows

### Initialization flow

- `settingStore.initSetting()` loads settings from `window.AIM.getSetting()`
- i18n is initialized from the loaded language
- `pluginStore` waits for `settingStore.i18nInit` before loading local plugins
  and injecting plugin i18n strings
- `dataStore.initData()` loads TTS history, library assets, editor draft,
  persisted media type, and persisted BGM
- legacy/older TTS records are normalized through `patchTemoData()` and
  `updateTemoData()`

### Synthesis flow

1. The user edits content in TipTap.
2. `home.tsx` or the history editor collects provider, speed, target, editor
   JSON, and optional BGM.
3. `getJSONDataFromEditorContents()` filters blocks based on synthesis target
   and any card-level voice override.
4. `extractTextSegmentsFromNode()` preserves inline speed/emotion marks.
5. `dataStore.mergeTemo()` builds provider-specific params for `Edge`,
   `OpenAI`, or `Volcano`.
6. The real synthesis request is delegated to
   `window.AIM.tts.mergeTemo(...)`.
7. Progress and completion updates return through host message handlers.
8. On success, the result is normalized and inserted into history.

### Translation flow

- `translate-panel.tsx` uses `window.AIM.translateContent(...)`
- supported translation providers in the UI are Microsoft, Google, OpenAI,
  ZhipuAI, Volctrans, DeepL, and Baidu
- translation results are merged back into adjacent `translateCard` nodes

### History and export flow

- `history.tsx` loads a record by route param or defaults to the newest item
- the left panel is the history list, the right panel previews audio plus the
  editable script
- re-synthesis from history uses the same `mergeTemo()` path against the
  existing record UUID
- audio export calls `window.AIM.tts.temoDownload(...)` and packages subtitle
  data derived from `infoData`
- video export calls `window.AIM.tts.renderMedia(...)`
- delete now uses a shadcn `AlertDialog` confirmation and permanently removes
  records without a recycle-bin step

## Message Flow

- `appStore` registers `window.AIM.handleMessage(..., 'TemoApp')`
- `appStore` forwards host renderer messages into the local `eventBus`
- `dataStore` and `pluginStore` subscribe to `customEvents.RendererMessage`
- `home.tsx`, `history.tsx`, and `translate-panel.tsx` also register their own
  direct `window.AIM.handleMessage(...)` listeners with separate handler keys

Practical consequence:

- message handling is split between the shared event bus path and page-local
  direct listeners, so changes to host events usually need a repo-wide check

## Main Stores

- `src/app/stores/settingStore.ts`
  Loads app settings, initializes i18n, and exposes settings-dependent helpers
- `src/app/stores/dataStore.ts`
  Owns TTS records, library data, persisted editor draft, media type,
  BGM, synthesis progress, and merge/export actions
- `src/app/stores/appStore.ts`
  Bridges host messages into the local event bus and persists the active route
  tab id
- `src/app/stores/pluginStore.ts`
  Loads local plugin metadata after i18n is ready, injects plugin translations,
  and manages plugin configuration state

## Provider And Plugin Reality

- Built-in providers are `Edge`, `OpenAI`, and `Volcano`
- plugin-backed TTS provider plumbing exists in `pluginStore`,
  `SelectTTSProvider`, and `tts-panel`
- `tts-panel` now uses an internal plugin voice selector built on the
  `src/app/lib/tts-mention/` data pipeline instead of the old external form
  renderer dependency

Important current-state nuance:

- the UI currently hardcodes `usePlugin.current = false` in
  `SelectTTSProvider`, `tts-panel`, and `tiptap`
- that means plugin-backed provider selection is effectively dormant in the
  current interface even though the plugin store still loads plugin metadata

## Host API Surface Used By This Repo

Top-level `window.AIM` calls seen in the current codebase include:

- `getSetting`
- `openDialog`
- `translateContent`
- `handleMessage`
- `removeHandler`
- platform flags like `isWindows` / `isMac`

`window.AIM.tts` calls seen in the current codebase include:

- `getTemoData`
- `updateTemoData`
- `deleteTemoData`
- `getTemoLibrary`
- `saveTemoLibrary`
- `copyTemoFile`
- `mergeTemo`
- `abortMergeTemo`
- `getTemoAudition`
- `renderMedia`
- `temoDownload`

`window.AIM.plugin` calls seen in the current codebase include:

- `readLocalPlugins`
- `saveConfiguration`

If you add a new host call, verify all of these together:

- this frontend usage
- the Electron preload/main-process bridge in the host project
- the fallback bridge setup in `src/app/main.tsx`

## Key UI Files

- `src/app/pages/home/home.tsx`
  Main authoring and synthesis page
- `src/app/pages/history/history.tsx`
  History list, preview, re-edit, export, and render flow
- `src/app/components/business/tiptap.tsx`
  Editor shell, import behavior, translate popover, BGM handling, and inline
  TTS mark integration
- `src/app/components/business/editor-item.tsx`
  `editorCard` node view with per-card translate and voice controls
- `src/app/components/business/translate-item.tsx`
  `translateCard` node view
- `src/app/components/business/tts-panel.tsx`
  Provider options, target selection, speed selection, and voice audition
- `src/app/components/business/translate-panel.tsx`
  Translation provider and target-language flow
- `src/app/components/business/tts-dialog.tsx`
  Media library picker for BGM

## File Map For Common Changes

If you need to change startup or host integration behavior:

- `src/app/main.tsx`
- `src/app/App.tsx`
- `src/app/routes/routes.tsx`
- `src/app/stores/index.ts`
- `src/app/stores/appStore.ts`

If you need to change the editor block model or card behavior:

- `src/app/components/business/tiptap.tsx`
- `src/app/components/business/editor-item.tsx`
- `src/app/components/business/translate-item.tsx`
- `src/app/components/extensions/editor-card.ts`
- `src/app/components/extensions/translate-card.ts`
- `src/app/components/extensions/paste-plugin.ts`
- `src/app/lib/utils.ts`

If you need to change inline TTS mark or segment behavior:

- `src/app/lib/tts-mention/`
- `src/app/components/business/tts-menu.tsx`
- `src/app/components/business/tts-bubble-menu.tsx`
- `src/app/lib/utils.ts`
- `src/app/stores/dataStore.ts`

If you need to change provider-specific synthesis payloads:

- `src/app/stores/dataStore.ts`
- `src/app/lib/tts.ts`
- `src/app/components/business/SelectTTSProvider.tsx`
- `src/app/components/business/tts-panel.tsx`
- `src/app/components/business/edge-config.tsx`
- `src/app/components/business/openAI-config.tsx`
- `src/app/components/business/volcano-config.tsx`
- `src/app/stores/pluginStore.ts`

If you need to change translation behavior:

- `src/app/components/business/translate-panel.tsx`
- `src/app/components/business/editor-item.tsx`
- `src/app/lib/utils.ts`
- `src/app/locales/`

If you need to change export or history behavior:

- `src/app/pages/history/history.tsx`
- `src/app/stores/dataStore.ts`
- `src/app/components/business/tts-dialog.tsx`

If you need to change settings or localization:

- `src/app/stores/settingStore.ts`
- `src/app/locales/`
- `src/app/interface.d.ts`

If you need to change plugin behavior:

- `src/app/stores/pluginStore.ts`
- `src/app/components/business/SelectTTSProvider.tsx`
- `src/app/components/business/tts-panel.tsx`

## Known Gotchas

- `README.md` is outdated and should not be trusted as project documentation.
- `package.json` still uses the legacy name `realtime-recorder`.
- `App.tsx` initializes settings and data in parallel, and `ready` can flip true
  before both sides are finished.
- The fallback bridge path in `main.tsx` does not cover the full host API
  surface used by the current app.
- Plugin-backed TTS provider UI is present in code but effectively disabled by
  `usePlugin.current = false`.
- `TTSType` still exists in store and editor code, but the home-page media type
  switch UI is currently commented out.
- translation and TTS use different Volctrans settings locations:
  translation reads `settings.volctrans`, while TTS reads `settings.tts.volctrans`.
- History export is split: audio uses `temoDownload`, video uses `renderMedia`.
- Some comments and labels contain mojibake or stale wording; prefer runtime
  behavior and call sites over old comments.
- `src/app/lib/tts.ts` is a very large static voice catalog file. Avoid reading
  the whole file unless you actually need the catalog contents.
- Message listeners are registered in multiple places with different handler
  keys. Be careful when changing host event names or cleanup behavior.
- Multi-line paste and Enter key behavior in the editor create/split
  `editorCard` nodes automatically. Changes to the block model can have
  surprising side effects.
- `HashRouter` and `base: './'` are intentional. Do not change them casually
  without checking the Electron loading path.
- This repo can be dirty during active work. Avoid reverting unrelated changes
  in business files.

## First Places To Read As A New Agent

Start here in order:

1. `src/app/stores/index.ts`
2. `src/app/main.tsx`
3. `src/app/App.tsx`
4. `src/app/routes/routes.tsx`
5. `src/app/pages/home/home.tsx`
6. `src/app/components/business/tiptap.tsx`
7. `src/app/components/business/editor-item.tsx`
8. `src/app/stores/dataStore.ts`
9. `src/app/stores/pluginStore.ts`
10. `src/app/pages/history/history.tsx`

That sequence gives the fastest path to understanding boot, routing, host
integration, editor structure, synthesis payload building, and export behavior.
