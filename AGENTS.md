# memo-tts Agent Guide

## Project Identity

`memo-tts` is the TTS editor frontend used by the Memo/Temo desktop workflow.
Despite the stale `package.json` name (`realtime-recorder`) and the generic `README.md`,
this repository is not a starter template. It is a real React application for:

- editing TTS script blocks with TipTap
- choosing a synthesis provider and voice options
- generating audio or video outputs
- managing history, trash, and local media library
- exporting rendered media through the host app

Treat this file as the reliable project briefing. The current `README.md` is template-era
documentation and does not describe the real runtime.

## Stack

- React 18
- TypeScript
- Vite 5
- MobX + `mobx-persist-store`
- TipTap editor
- Tailwind + SCSS
- Radix UI components
- `@memo/iframe-ipc` for fallback bridge mode

Package manager: `pnpm`

## Useful Commands

- `pnpm dev`
  Starts Vite on `http://localhost:5175/`
- `pnpm build`
  Runs `tsc && vite build`
- `pnpm preview`
  Serves the built bundle locally

Important build details:

- `vite.config.ts` sets `base: './'`
- routing uses `HashRouter`

Those two choices are important because this app is often loaded from a local file path
inside Electron, not just from a web server.

## Runtime Modes

### 1. Normal desktop-hosted mode

This is the main production/runtime path.

- A sibling Electron app (`electron-react`) opens this frontend
- In that mode, `window.AIM` is injected by the Electron preload bridge
- Host APIs under `window.AIM`, `window.AIM.tts`, and `window.AIM.plugin` do the real work

Previously verified integration notes:

- the host opens the TTS app through `window.AIM.browser.openTTS()`
- dev mode points the host to `http://localhost:5175/`
- production mode points the host to a copied static bundle at `apps/temo/index.html`

Practical consequence:

changing code in this repo alone does not update the host's production TTS page until the
bundle is rebuilt and synced into the Electron host project.

### 2. Fallback iframe/web mode

`src/app/main.tsx` creates a `new Bridge(...)` from `@memo/iframe-ipc` only when
`window.AIM` does not already exist.

This makes the app runnable in a fallback iframe/web context, but that path is best-effort.
The codebase uses more host APIs than the fallback `methods` list explicitly declares, so
standalone mode should not be assumed to support every feature.

## Boot Sequence

1. `src/app/main.tsx`
   Creates fallback `window.AIM` when needed, mounts React, then posts `removeLoading`.
2. `src/app/App.tsx`
   Initializes `dataStore` and `settingStore`, then registers message listeners.
3. `src/app/routes/routes.tsx`
   Uses `HashRouter` and exposes three main routes: `/home`, `/history/:id?`, `/trash`.
4. `src/app/pages/home/home.tsx`
   Drives the main edit-and-synthesize workflow.

## Core Data Flow

### Initialization

- `settingStore.initSetting()` loads app settings from `window.AIM.getSetting()`
- i18n is initialized from the loaded settings
- `dataStore.initData()` loads saved TTS records, trash, library data, editor draft, TTS type, and BGM

### Synthesis flow

1. The user edits content in TipTap
2. `home.tsx` collects editor JSON, provider, speed, target, and optional BGM
3. `dataStore.mergeTemo()` converts editor content into provider-specific payloads
4. The real synthesis request is delegated to `window.AIM.tts.mergeTemo(...)`
5. Progress and completion events return through host message channels
6. On success, the result is normalized and pushed into history

### Message flow

- `window.AIM.handleMessage(...)` is registered in multiple places
- `appStore` forwards renderer messages into the local `eventBus`
- `dataStore` and pages listen for synthesis progress, completion, abort, and error updates

## Main Stores

- `src/app/stores/settingStore.ts`
  Loads settings, initializes i18n, tracks UI-level settings state
- `src/app/stores/dataStore.ts`
  Owns TTS records, trash, library, current generation progress, and merge/export actions
- `src/app/stores/appStore.ts`
  Bridges host messages into the app event bus
- `src/app/stores/pluginStore.ts`
  Reads local plugins after i18n is ready and manages plugin configuration state

Store persistence uses `mobx-persist-store` backed by `window.localStorage`.

## Key UI Files

- `src/app/pages/home/home.tsx`
  Main TTS authoring screen
- `src/app/pages/history/history.tsx`
  History view, audition, export, render/download actions
- `src/app/pages/trash/trash.tsx`
  Trash management
- `src/app/components/business/tiptap.tsx`
  Core editor behavior and editor card composition
- `src/app/components/business/tts-panel.tsx`
  Provider options, target selection, voice audition
- `src/app/components/business/translate-panel.tsx`
  Translation-related flow used before synthesis

## Host API Surface Used By This Repo

Top-level `window.AIM` calls seen in this repo include:

- `getSetting`
- `openDialog`
- `translateContent`
- `handleMessage`
- `removeHandler`
- platform flags like `isWindows` / `isMac`

`window.AIM.tts` calls seen in this repo include:

- `getTemoData`
- `updateTemoData`
- `getTemoTrash`
- `saveTemoTrash`
- `getTemoLibrary`
- `saveTemoLibrary`
- `copyTemoFile`
- `mergeTemo`
- `abortMergeTemo`
- `getTemoAudition`
- `renderMedia`
- `temoDownload`

`window.AIM.plugin` calls seen in this repo include:

- `readLocalPlugins`
- `saveConfiguration`

If you add a new host call, verify both sides:

- this frontend usage
- the Electron preload/main-process bridge in the host project

Also check whether `src/app/main.tsx` fallback bridge setup needs to be expanded.

## File Map For Common Changes

If you need to change startup/integration behavior:

- `src/app/main.tsx`
- `src/app/App.tsx`
- `src/app/routes/routes.tsx`

If you need to change the editor or block model:

- `src/app/components/business/tiptap.tsx`
- `src/app/components/extensions/`
- `src/app/lib/utils.ts`

If you need to change provider-specific synthesis payloads:

- `src/app/stores/dataStore.ts`
- `src/app/lib/tts.ts`
- `src/app/components/business/edge-config.tsx`
- `src/app/components/business/openAI-config.tsx`
- `src/app/components/business/volcano-config.tsx`

If you need to change export/history behavior:

- `src/app/pages/history/history.tsx`
- `src/app/stores/dataStore.ts`

If you need to change settings or localization:

- `src/app/stores/settingStore.ts`
- `src/app/locales/`

If you need to change plugin behavior:

- `src/app/stores/pluginStore.ts`

## Known Gotchas

- `README.md` is outdated and should not be trusted as project documentation.
- `package.json` still uses the legacy name `realtime-recorder`.
- Some comments in the codebase contain mojibake/encoding noise; prefer runtime behavior and call sites over old comments.
- The fallback bridge path in `main.tsx` is not a guarantee that every feature works outside the Electron host.
- `HashRouter` and `base: './'` are intentional. Do not switch them casually without checking the Electron loading path.
- This repo can be dirty during active work. Avoid reverting unrelated changes in business files.

## First Places To Read As A New Agent

Start here in order:

1. `src/app/main.tsx`
2. `src/app/App.tsx`
3. `src/app/routes/routes.tsx`
4. `src/app/pages/home/home.tsx`
5. `src/app/stores/dataStore.ts`
6. `src/app/stores/settingStore.ts`

That sequence gives the fastest path to understanding boot, routing, host integration, and
the synthesis pipeline.
