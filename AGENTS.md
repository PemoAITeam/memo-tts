# memo-tts Agent Guide

## Project Identity

`memo-tts` is the current TTS authoring frontend used by the Memo desktop
workflow.

The real app in the current
codebase is a plugin-driven TTS editor that now focuses on:

- editing script blocks with TipTap
- selecting host-installed TTS plugin providers
- inserting inline voice mentions with `@`
- applying segment-level speed/emotion/other plugin fields to selected text
- synthesizing host-managed audio or video records
- browsing, previewing, exporting, and deleting history items from a left
  sidebar

Treat this file as the source of truth for the repo. `README.md` has improved,
but it still mixes in older architecture assumptions and is not fully aligned
with the latest code.

## Stack

- React 18
- TypeScript
- Vite 5
- MobX + `mobx-persist-store`
- TipTap
- Tailwind + SCSS
- Radix UI / shadcn-style primitives in `src/app/components/ui/`
- `@aim-packages/plugin-manager`
- `@aim-packages/iframe-ipc`

Package manager: `pnpm`

Other useful build facts:

- path alias `@/* -> ./src/*`
- `vite.config.ts` sets `base: './'`
- routing uses `HashRouter`
- `tsconfig.json` is strict and enables `noUnusedLocals` /
  `noUnusedParameters`
- there is currently no automated test suite in this repo

`HashRouter` and `base: './'` are intentional because this app is often loaded
from a local file path inside Electron.

## Useful Commands

- `pnpm dev`
  Starts Vite on `http://localhost:5175/`
- `pnpm build`
  Runs `tsc && vite build`
- `pnpm lint`
  Runs ESLint over `ts` and `tsx`
- `pnpm preview`
  Serves the built bundle locally

## Current App Shape

The current app is a single routed surface, not a multi-page editor/history
split.

- `src/app/routes/routes.tsx` renders a permanent left sidebar plus a right
  content panel
- route `/` redirects to `/home`
- routes `/home` and `/home/:id` both render `HomePage`
- the left sidebar is the history list
- the right panel is the editor plus preview for the active draft/history item

There is no standalone `history.tsx` page in the current repo.

There is also no active translation page, no active `translateCard` document
flow, and no active BGM/library picker UI in the current interface.

## Runtime Modes

### 1. Normal desktop-hosted mode

This is the main runtime path.

- an Electron host injects `window.AIM`
- the host provides settings, plugin metadata, TTS merge, preview, export, and
  file dialogs

Practical consequence:

changing code in this repo alone does not update the production host UI until
the frontend bundle is rebuilt and synced into the host project.

### 2. Fallback iframe/web mode

`src/app/main.tsx` creates a `new Bridge(...)` from
`@aim-packages/iframe-ipc` only when `window.AIM` does not already exist.

The fallback bridge currently declares these methods:

- top-level: `getSetting`, `openDialog`
- plugin: `readLocalPlugins`, `saveConfiguration`, `getProviders`
- tts: `getTemoData`, `updateTemoData`, `deleteTemoData`, `getTemoLibrary`,
  `saveTemoLibrary`, `copyTemoFile`, `mergeTemo`, `abortMergeTemo`,
  `getTemoAudition`, `synthesize`, `getPluginEditorOptions`, `renderMedia`,
  `temoDownload`

This mode is still host-dependent in practice. Voice preview, dynamic editor
options, export, and plugin synthesis all require the other side of the bridge
to support the same APIs.

## Boot And Initialization

1. `src/app/stores/index.ts`
   Configures `mobx-persist-store` with `window.localStorage`, 24 hour expiry,
   then instantiates `settingStore`, `pluginStore`, `dataStore`, and
   `appStore`.
2. `src/app/main.tsx`
   Creates the fallback bridge when needed, mounts React, then posts
   `removeLoading`.
3. `src/app/App.tsx`
   Starts `dataStore.initData()` and `settingStore.initSetting()` in parallel.
4. After settings init completes, `App.tsx` registers:
   `appStore.handleMessage()`, `pluginStore.handlePluginMessage()`, and
   `dataStore.handleDataMessage()`.
5. `src/app/routes/routes.tsx`
   mounts the sidebar/history shell.
6. `src/app/pages/home/home.tsx`
   drives both new-draft editing and existing-history-item editing.

Important nuances:

- `App.tsx` sets `ready` to `true` in both init promises, so routing can render
  before both settings and data are fully ready.
- `settingStore.initSetting()` is the only place that currently loads settings
  in practice.
- `SettingStore.handleMessage()` contains logic for `setting:change`, but that
  listener is not wired anywhere in `App.tsx`. Live setting changes are not
  currently subscribed in the UI.

## Core Data Model

### Editor document model

The current document model is much simpler than older docs suggest.

- `normalizeEditorDocument()` in `src/app/lib/utils.ts` is the authoritative
  normalization step
- normalized editor data is always `{ type: 'doc', content: editorCard[] }`
- only `editorCard` nodes survive normalization
- any old `translateCard` or other block types are dropped during
  normalization
- `editorCard.attrs.id` is generated if missing
- `editorCard.attrs.voice` is preserved and normalized to target `original`
- the app guarantees at least one `editorCard`
- multi-line paste is split into multiple `editorCard` nodes by
  `src/app/components/extensions/paste-plugin.ts`
- drag-and-drop import supports `.txt`, `.doc`, `.docx`, and `.md`

### Voice and segment control layers

There are now four relevant configuration layers during synthesis:

1. global selection config from the chosen TTS provider
2. card-level config from `editorCard.attrs.voice`
3. inline voice mention config from `ttsMention`
4. selected-text segment config from `ttsMark`

The live merge path is in `dataStore.mergeTemo()`, which combines options in
this order:

- base selection config
- card voice config
- inline voice mention config
- segment runtime config derived from the selected-text mark

Later layers override earlier ones.

### Inline voice mention model

- typing `@` opens the custom TTS mention menu
- choosing a voice inserts a `ttsMention` inline atom node
- the selected voice config is stored as serialized JSON in the node attrs
- menus are powered by `src/app/lib/tts-mention/`

### Segment-level mark model

- selecting text opens the bubble menu
- the bubble menu exposes segment-scoped plugin fields except voice
- the selected values are stored in `ttsMark.attrs.config`
- `speed` / `emotion` are also mirrored for UI labeling when applicable

### History model

- history is stored in `dataStore.temoData`
- the active history item is selected by route param `/home/:id`
- `TemoData.ttsOptions` stores either:
  - the current plugin-style `schemaVersion: 2` selection
  - or a normalized legacy selection parsed by `parseStoredTTSSelection()`

## Plugin TTS Reality

The current app is plugin-first.

- provider options shown in the UI come from `pluginStore.ttsProviders`
- `pluginStore` builds that list from host plugin metadata
- `src/app/lib/tts-plugin.ts` interprets plugin manifests,
  `memoTtsEditor`, exposed fields, and option loading
- `SelectTTSProvider` only renders plugin-backed providers

Legacy built-in providers still matter only for compatibility:

- old Edge/OpenAI/Volcengine records can still be parsed into a normalized
  legacy selection
- new synthesis refuses to run with a legacy selection
- the user must reselect a plugin voice before synthesizing legacy items

Dynamic provider features:

- `window.AIM.tts.getPluginEditorOptions()` can provide dynamic field options
  for mention menus and bubble menus
- `window.AIM.tts.synthesize()` can provide voice preview from the mention menu

Important current-state nuance:

- `pluginStore` still has configuration-checking state
  (`checkPlugin`, `showPluginConfiguration`, `saveConfiguration`)
- but the current repo has no active configuration form or modal wired to that
  state

## Core Flows

### Initialization flow

- `settingStore.initSetting()` loads `window.AIM.getSetting()` and initializes
  i18n
- `pluginStore` waits for `settingStore.i18nInit`, then calls
  `window.AIM.plugin.readLocalPlugins()`
- plugin translations are registered through
  `src/app/lib/plugin-i18n.ts`
- `dataStore.initData()` loads:
  - host history via `window.AIM.tts.getTemoData()`
  - host library via `window.AIM.tts.getTemoLibrary()`
  - local draft editor JSON from `localStorage['temo-editor']`
  - local persisted media type from `localStorage['temo-tts-type']`
- old/legacy records are normalized through `patchTemoData()`,
  `updateTemoData()`, and `normalizeEditorDocument()`

### Draft and history editing flow

- the sidebar in `routes.tsx` renders `dataStore.temoData`
- clicking an item navigates to `/home/:id`
- `HomePage` loads either:
  - the selected history item's `editorData`
  - or the persisted draft `dataStore.editorData`
- the same screen also previews the current record if it already has a
  generated media file

### Synthesis flow

1. The user chooses a provider in `SelectTTSProvider`.
2. The user types script content into TipTap.
3. The user can:
   - type `@` to insert an inline voice mention
   - select text to add segment-level marks
4. `HomePage.buildHomeSelection()` merges:
   - plugin manifest defaults
   - stored host plugin configuration
   - runtime config cached in `pluginStore`
   - current item's stored selection when it matches the active provider
5. `dataStore.mergeTemo()` normalizes the editor JSON and extracts
   `editorCard` segments through
   `extractTextSegmentsFromNodeWithMentions()`.
6. Long text segments over 1000 chars are split with `splitString()`.
7. The host request is delegated to:
   `window.AIM.tts.mergeTemo(payload, uuid, extra)`.
8. Shared renderer messages update `currentTTSUUID` and
   `currentTTSProgress`.
9. On success, the record is inserted at the top of history and the route jumps
   to `/home/:uuid`.
10. If synthesis came from a new draft, the editor is cleared back to a single
    empty `editorCard`, persisted draft JSON is reset, and `TTSType` is reset
    to `audio`.

### Preview flow

- audio history items use `HistoryAudioPlayer`
- video history items use a native `<video>` element
- autoplay is coordinated by route state tokens

### Export flow

- the sidebar download button branches on `TemoData.type`
- audio export:
  - generates subtitle text from `infoData` via `getTextFragment()`
  - calls `window.AIM.tts.temoDownload(...)`
- video export:
  - opens a save dialog
  - builds a render payload from `fileList` and metadata
  - calls `window.AIM.tts.renderMedia(...)`

### Delete flow

- delete is permanent
- the sidebar uses a Radix `AlertDialog`
- `dataStore.removeTemoData()` performs an optimistic local removal
- then it calls both:
  - `window.AIM.tts.updateTemoData(...)`
  - `window.AIM.tts.deleteTemoData(...)`
- on failure, it restores the previous local list

### Plugin refresh flow

- `pluginStore` listens for `memo:plugins:refresh`
- refreshed plugin data replaces `memoPlugins`
- provider list and plugin i18n bundles are rebuilt from the new payload

## Message Flow

- `appStore.handleMessage()` registers `window.AIM.handleMessage(..., 'TemoApp')`
- `appStore` forwards host renderer messages into the local `eventBus`
- `dataStore` listens on `customEvents.RendererMessage` for:
  - `temo:audio:start`
  - `temo:audio:progress`
  - `temo:audio:error`
  - `temo:audio:abort`
  - `temo:audio:end`
- `pluginStore` listens on the same bus for `memo:plugins:refresh`
- `HomePage` also registers a direct handler with key `MemoTTSContent`
  for immediate audio error display
- `routes.tsx` registers a direct handler with key `MemoTTSSidebar`
  for export progress and completion

Practical consequence:

message handling is split between the shared event bus and direct page-level
handlers, so host event changes still require a repo-wide audit.

## Main Stores

- `src/app/stores/settingStore.ts`
  Loads settings, initializes i18n, and registers plugin translations.
- `src/app/stores/pluginStore.ts`
  Loads local plugins after i18n is ready, builds `ttsProviders`, exposes
  manifest/provider helpers, and stores runtime TTS config.
- `src/app/stores/dataStore.ts`
  Owns history data, draft editor JSON, library data, persisted media type,
  synthesis progress state, merge calls, and delete/export helpers.
- `src/app/stores/appStore.ts`
  Bridges host renderer messages into the local event bus and persists the
  current route-level `temoId`.

## Host API Surface Used By This Repo

Top-level `window.AIM` calls currently used:

- `getSetting`
- `openDialog`
- `handleMessage`
- `removeHandler`
- platform flags: `isWindows`, `isMac`

`window.AIM.plugin` calls currently used:

- `readLocalPlugins`
- `saveConfiguration`

`window.AIM.tts` calls currently used:

- `getTemoData`
- `updateTemoData`
- `deleteTemoData`
- `getTemoLibrary`
- `saveTemoLibrary`
- `copyTemoFile`
- `mergeTemo`
- `abortMergeTemo`
- `synthesize`
- `getPluginEditorOptions`
- `renderMedia`
- `temoDownload`

Bridged in `main.tsx` but not currently used by active app code:

- `plugin.getProviders`
- `tts.getTemoAudition`

If you add or change a host call, verify all of these together:

- the frontend usage in this repo
- `src/app/interface.d.ts`
- the fallback bridge in `src/app/main.tsx`
- the Electron preload/main-process bridge in the host project

## Active File Map

If you need to change startup or host integration behavior:

- `src/app/main.tsx`
- `src/app/App.tsx`
- `src/app/routes/routes.tsx`
- `src/app/stores/index.ts`
- `src/app/stores/appStore.ts`
- `src/app/interface.d.ts`

If you need to change provider loading or plugin metadata behavior:

- `src/app/stores/pluginStore.ts`
- `src/app/lib/tts-plugin.ts`
- `src/app/lib/plugin-i18n.ts`
- `src/app/components/business/SelectTTSProvider.tsx`

If you need to change editor block behavior:

- `src/app/components/business/tiptap.tsx`
- `src/app/components/business/editor-item.tsx`
- `src/app/components/extensions/editor-card.ts`
- `src/app/components/extensions/paste-plugin.ts`
- `src/app/lib/utils.ts`

If you need to change inline voice mention behavior:

- `src/app/lib/tts-mention/data.ts`
- `src/app/lib/tts-mention/use-tts-mention-menu.ts`
- `src/app/lib/tts-mention/tts-mention-simple.ts`
- `src/app/lib/tts-mention/tts-mention-plugin.ts`
- `src/app/components/business/tts-menu.tsx`

If you need to change selected-text segment controls:

- `src/app/lib/tts-mention/use-tts-bubble-menu.ts`
- `src/app/lib/tts-mention/tts-mark.ts`
- `src/app/components/business/tts-bubble-menu.tsx`

If you need to change synthesis payload building:

- `src/app/stores/dataStore.ts`
- `src/app/lib/tts-segments.ts`
- `src/app/lib/tts-plugin.ts`
- `src/app/lib/utils.ts`

If you need to change preview, export, or history-shell behavior:

- `src/app/routes/routes.tsx`
- `src/app/pages/home/home.tsx`
- `src/app/components/business/history-audio-player.tsx`
- `src/app/stores/dataStore.ts`

If you need to change settings or localization:

- `src/app/stores/settingStore.ts`
- `src/app/locales/`
- `src/app/lib/plugin-i18n.ts`

## Known Gotchas

- `README.md` is still not fully trustworthy for current architecture.
- `package.json` 
- The app is plugin-first now. Older built-in provider names mainly survive in
  legacy-selection compatibility code.
- There is no standalone history page anymore.
- There is no active translation UI and no current `window.AIM.translateContent`
  call in this repo.
- There is no active BGM/library picker UI, even though `dataStore` still
  persists `libraryData` and exposes `copyLibraryFile()`.
- `editorCard.attrs.voice` still affects synthesis and can be cleared from old
  content, but the current UI has no active control for creating/updating a
  card-level voice override.
- `normalizeEditorDocument()` drops non-`editorCard` blocks. Old
  `translateCard` content will not survive normalization.
- `App.tsx` can render before both init paths are complete.
- `SettingStore.handleMessage()` exists but is not currently registered.
- `src/app/lib/utils.ts` still contains older duplicated text-segmentation
  helpers. The live synthesis path uses `src/app/lib/tts-segments.ts`.
- `src/app/components/extensions/tts-card.ts` looks like leftover legacy code
  and is not part of the active editor pipeline.
- `src/app/components/business/web-page-text.tsx` is an unused helper.
- `TTSMentionMark` and the mark-based `selectVoice()` path are compatibility
  leftovers; the active UI inserts `ttsMention` nodes through
  `useTTSMentionMenu()`.
- `TTSType` still exists and is sent to the host merge API, but the current UI
  does not expose an audio/video mode switch.
- This repo can be dirty during active work. Avoid reverting unrelated changes.

## First Places To Read As A New Agent

Start here in order:

1. `src/app/stores/index.ts`
2. `src/app/main.tsx`
3. `src/app/App.tsx`
4. `src/app/routes/routes.tsx`
5. `src/app/pages/home/home.tsx`
6. `src/app/components/business/tiptap.tsx`
7. `src/app/stores/dataStore.ts`
8. `src/app/stores/pluginStore.ts`
9. `src/app/lib/tts-plugin.ts`
10. `src/app/lib/tts-segments.ts`
11. `src/app/lib/tts-mention/data.ts`
12. `src/app/components/business/editor-item.tsx`

That sequence gives the fastest path to understanding boot, routing, plugin
provider discovery, editor behavior, synthesis payload building, and the
history/export shell that exists in the current code.
