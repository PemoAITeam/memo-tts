# memo-tts TTS Plugin Refactor

## Status

This document started as the target-state refactor plan for making `memo-tts`
plugin-only.

It now serves two purposes at once:

- target architecture / design intent
- implementation record for the work already landed in this repo

Current snapshot:

- Phase 1 is effectively complete
- Phase 2 is effectively complete
- Phase 3 is only partially complete
- segment-level option-based plugin fields now flow through the Bubble Menu, but
  richer field types and the remaining editor UX generalization are still
  incomplete
- Bubble Menu option requests now merge runtime config, card-level voice
  overrides, inline `@voice` context, and the current segment mark config so
  dependent plugin fields stay in sync more reliably
- plugin-provided i18n bundles are now registered into the renderer i18next
  tree and consumed through a shared plugin translation helper, so plugin
  labels render consistently across exposed forms, provider pickers, mention
  menus, and segment controls
- real build/runtime verification is still pending in an environment with
  working `node` / `pnpm` and the actual Electron host

For the latest acceptance audit, see:

- `docs/refactor-acceptance-matrix.md`
- `docs/plugin-editor-options-source-of-truth.md`

For the current real host implementation, prefer:

- `F:\Develop\electron-react\docs\memo-tts-plugin-host.md`

## Overview

This document defines the full refactor plan for turning `memo-tts` into a
plugin-only TTS frontend.

For the historical host-side adapter plan in this repo, see
`docs/electron-host-adapter.md`.

For the current host implementation notes, see
`F:\Develop\electron-react\docs\memo-tts-plugin-host.md`.

After this refactor:

- TTS providers are loaded only from Electron plugins.
- The frontend no longer contains built-in Edge/OpenAI/Volcano service logic.
- Voice, speed, emotion, and other editable TTS fields are driven by plugin
  manifest metadata instead of hardcoded frontend rules.
- The frontend submits generic plugin payloads.
- The Electron host is responsible for resolving provider-specific parameters
  and invoking plugin `textToSpeech(...)`.

## Original Problems (Pre-Refactor Baseline)

This section describes the starting state before the changes recorded later in
`Execution Status`.

The current codebase already loads plugin metadata, but the active TTS flow is
still built around built-in providers:

- `SelectTTSProvider`, `tts-panel`, and `tiptap` hardcode `usePlugin.current =
  false`.
- `home.tsx`, `tiptap.tsx`, `tts-mention/types.ts`, and `dataStore.ts`
  primarily accept `Edge | OpenAI | Volcano`.
- `dataStore.mergeTemo()` builds three different provider-specific payloads in
  the frontend.
- TipTap provider menus and speed/emotion UI are built from static frontend
  datasets.

This means the frontend can see plugin manifests but still cannot use plugins as
the single source of truth for TTS capabilities.

## Target Architecture

### Ownership Split

Frontend responsibilities:

- load available TTS providers from plugin metadata
- render plugin-exposed configuration forms
- store global, card-level, and segment-level TTS configuration
- split editor content into text segments
- merge config layers into a generic plugin payload

Electron host responsibilities:

- expose provider list and plugin execution APIs to the renderer
- map provider -> pluginId -> plugin instance
- merge persistent secrets/configuration with runtime config
- call `plugin.textToSpeech(...)`
- own provider-specific protocol translation

### Runtime Flow

1. plugin metadata is loaded through `window.AIM.plugin.readLocalPlugins()`
2. frontend derives TTS provider list from installed plugin manifests
3. user selects a provider
4. frontend renders plugin-exposed fields using `memo-form-renderer`
5. editor stores TTS config in a plugin-generic structure
6. synthesis submits a generic payload containing:
   - provider
   - pluginId
   - merged per-segment options
   - editor persistence metadata
7. Electron host resolves and executes the plugin

## Data Model

### Provider Metadata

Provider metadata should be derived from installed plugin manifests and include:

- provider string
- pluginId
- display label
- disabled state
- manifest version
- exposed/runtime fields
- required configuration fields
- optional editor capability metadata

### Editor Config Layers

Three configuration layers are supported:

- global TTS config
- card-level override config
- segment-level override config

Merge priority:

`segment > card > global`

### Persistence Shape

The persisted `ttsOptions` inside `TemoData` should move to a plugin-generic
schema.

Recommended shape:

```ts
{
  schemaVersion: 2,
  provider: "OpenAI TTS",
  pluginId: "memo-plugin-tts-openai",
  target: "original",
  config: {
    model: "tts-1",
    voice: "alloy",
    speed: 1
  },
  displayLabel: "alloy"
}
```

### Card Voice Shape

`editorCard.attrs.voice` should use the same plugin-generic model:

```ts
{
  schemaVersion: 2,
  provider: "Edge TTS",
  pluginId: "memo-plugin-tts-edge",
  target: "original",
  displayLabel: "zh-CN-XiaoxiaoNeural",
  config: {
    language: "ZH_CN",
    voiceName: "zh-CN-XiaoxiaoNeural",
    rate: 20
  }
}
```

### Segment Voice Shape

`ttsMention.attrs.config` should also store plugin-generic config:

```ts
{
  provider: "OpenAI TTS",
  pluginId: "memo-plugin-tts-openai",
  displayLabel: "alloy",
  config: {
    voice: "alloy",
    speed: 1.25
  }
}
```

## Manifest Extension

The existing manifest fields are not enough to drive the editor experience by
themselves. Each TTS plugin should add editor metadata.

Recommended new manifest field:

```json
"memoTtsEditor": {
  "version": 1,
  "displayField": "voiceName",
  "fields": {
    "language": { "scope": ["global", "card"], "role": "language" },
    "voiceName": { "scope": ["global", "card", "segment"], "role": "voice" },
    "rate": { "scope": ["global", "card", "segment"], "role": "speed" }
  }
}
```

This lets the frontend infer:

- which fields are editable globally
- which fields are editable per card
- which fields are editable per segment
- which field should be used as the display label
- which field represents voice/speed/emotion

## Frontend File Plan

### Foundation

- `src/app/lib/tts-plugin.ts`
  - add generic plugin-only TTS types
  - add provider metadata extraction helpers
  - add display label helpers
  - add config merge helpers

- `src/app/interface.d.ts`
  - add typed `window.AIM.plugin.getProviders("tts")`
  - add typed `window.AIM.tts.synthesize(...)`
  - add typed generic TTS payload interfaces

### Provider Flow

- `src/app/stores/pluginStore.ts`
  - remove built-in provider default
  - derive `ttsProviders` from plugin manifests
  - auto-select first valid provider
  - expose helper methods for looking up manifest/provider metadata

- `src/app/components/business/SelectTTSProvider.tsx`
  - remove built-in provider choices
  - render plugin providers only
  - disable selection when no TTS plugins are installed

### Config Panels

- `src/app/components/business/tts-panel.tsx`
  - remove `EdgeConfig`, `OpenAIConfig`, `VolcanoConfig`
  - render only plugin exposed forms
  - emit generic selection/config objects
  - move audition to unified `window.AIM.tts.synthesize(...)`

- `src/app/components/business/editor-item.tsx`
  - stop writing provider-specific card objects
  - store plugin-generic card config

- `src/app/components/business/tiptap.tsx`
  - widen provider type to string
  - persist generic selection objects
  - prepare to replace static segment TTS editing

### Synthesis

- `src/app/stores/dataStore.ts`
  - remove provider-specific payload building
  - build plugin-generic payload
  - merge global/card/segment config layers
  - persist generic `ttsOptions`

### Editor System

Phase 1:

- keep current mention and bubble menu code compiling
- allow provider type to become generic string
- avoid introducing new built-in logic

Phase 2:

- replace static provider tree in `tts-mention/data.ts`
- replace fixed speed/emotion bubble menu with plugin-driven field editing
- render segment-level editable fields from `memoTtsEditor.fields`

### Decommissioned Built-ins

These files should leave the active flow:

- `src/app/components/business/edge-config.tsx`
- `src/app/components/business/openAI-config.tsx`
- `src/app/components/business/volcano-config.tsx`
- `src/app/lib/tts.ts` as runtime voice source

## Electron Host Changes

The host project must expose plugin-native TTS APIs.

Required APIs:

- `window.AIM.plugin.getProviders("tts")`
- `window.AIM.tts.synthesize({ provider, pluginId, text, options, returnBuffer })`
- `window.AIM.tts.mergeTemo(...)` updated to accept plugin payloads

Host implementation responsibilities:

- resolve provider to pluginId
- load plugin via plugin manager
- combine persistent configuration with runtime config
- call `plugin.textToSpeech(...)`

## Rollout Plan

### Phase 1

- add plugin-generic types and helpers
- switch provider selection to plugin-only
- switch `tts-panel` to plugin-only forms

### Phase 2

- switch card-level config to plugin-generic model
- refactor `mergeTemo` to generic plugin payloads
- update history/home/tiptap to consume generic persisted config

### Phase 3

- replace static TipTap provider/speed/emotion logic with plugin-driven editor
  metadata
- add segment-level plugin editing UI

### Phase 4

- remove built-in config components from active code path
- clean unused built-in datasets

## Risks

- history items persisted with old built-in `ttsOptions` may require migration or
  compatibility fallback
- Electron host must be updated together with frontend payload changes
- fallback iframe bridge currently lacks plugin APIs and must be expanded
- segment-level plugin editing is larger than card/global provider refactor and
  should land after the main provider flow works

## Validation

Minimum validation after Phase 1 and Phase 2:

- app loads with plugin metadata present
- first installed TTS plugin becomes selectable
- provider dropdown renders only plugin providers
- global TTS panel renders plugin-exposed form fields
- card-level voice panel persists plugin config structure
- `mergeTemo` emits generic plugin payload shape
- history view can reopen items created after the refactor

## Immediate Execution Scope

This implementation session should start with:

1. create the plugin TTS foundation types/helpers
2. switch provider selection to plugin-only
3. switch `tts-panel` to plugin-only rendering
4. refactor the main synthesis flow to generic plugin payloads

Segment-level manifest-driven editing remains the next major follow-up step after
the main flow is stable.

## Execution Status

Completed in this repo:

- added `src/app/lib/tts-plugin.ts` as the shared plugin TTS type layer
- switched `pluginStore` to derive active providers from plugin manifests
- replaced `SelectTTSProvider` with plugin-only provider selection
- replaced `tts-panel` with plugin-only exposed-form rendering and unified
  audition
- refactored `home.tsx`, `tiptap.tsx`, `editor-item.tsx`, and
  `dataStore.ts` to use generic `TTSSelection`
- changed `mergeTemo` payload building to plugin-generic structure
- widened TipTap TTS menu provider typing from built-in unions to `string`
- added renderer bridge typings for plugin TTS APIs in `interface.d.ts`
- switched TipTap mention provider list and voice menu to plugin metadata
- added runtime plugin TTS config caching so editor menus can reuse current panel
  selection
- gated Bubble Menu speed/emotion controls behind plugin editor field support
- refactored Bubble Menu from fixed `speed` / `emotion` controls into
  plugin-driven `segment` field rendering, and made segment marks persist
  generic config payloads
- fixed TipTap `@voice` cascading menu so plugin field values flow correctly
  across provider/language/scene/model steps
- made TipTap derive its active provider from the current global/history
  selection so inline voice and segment controls follow the selected plugin in
  more contexts
- made inline voice mentions carry runtime context fields like
  language/scene/model when plugins require them but do not expose those fields
  at segment scope
- expanded `src/app/main.tsx` fallback bridge to declare the nested `plugin.*`
  and `tts.*` APIs used by the plugin-only frontend
- wired TipTap `@voice` menu audition buttons to the unified
  `window.AIM.tts.synthesize(...)` plugin preview path
- fixed TipTap cascading submenu selection so provider/language/scene/model
  context is preserved when drilling into submenus and when inserting the final
  mention config
- removed unused built-in `Edge/OpenAI/Volcano` helper exports from the active
  TipTap mention data surface so new code paths resolve through plugin metadata
  only
- decoupled the active Bubble Menu option typing/export surface from the legacy
  `tts-speed.ts` helpers so current segment controls no longer depend on the old
  built-in speed/emotion module
- removed the dormant `/`-trigger `tts-speed` menu subsystem from the repo
  because the active segment editing flow now lives in the plugin-driven Bubble
  Menu path
- removed unused built-in config components
  `edge-config.tsx`, `openAI-config.tsx`, and `volcano-config.tsx` from the
  repo so the remaining TTS UI surface is plugin-only
- decoupled renderer typing from the legacy static voice catalog by widening
  `AllLanguage` usage in `interface.d.ts`, so the active TTS path no longer
  depends on `src/app/lib/tts.ts`
- added a legacy TTS compatibility layer in `src/app/lib/tts-plugin.ts` so old
  persisted built-in `ttsOptions`, card voice data, and inline mention config
  can still be read as normalized `TTSSelection`
- added legacy provider rebinding in `tiptap.tsx` so stored `Edge` / `OpenAI` /
  `Volcano` history items can auto-attach to installed plugin providers when the
  plugin provider value matches
- made `resolveStoredTTSSelection(...)` hydrate `editorFields` from the current
  plugin manifest so older plugin-native records still keep segment
  speed/emotion mapping after reopening
- blocked synthesis for unresolved legacy selections in `dataStore.mergeTemo()`
  so old records are forced to rebind to a real plugin voice before they can be
  synthesized again
- added a history-page warning banner in `tiptap.tsx` so unresolved legacy
  selections are visible before the user clicks synthesize
- removed the now-unused legacy static voice catalog files
  `src/app/lib/tts.ts` and `src/app/lib/volcano.config.ts` because no active
  runtime code imports them anymore
- added optional host-backed editor option loading through
  `window.AIM.tts.getPluginEditorOptions(...)` so TipTap menus can support TTS
  plugins whose editable fields are implemented as custom plugin components
  instead of plain manifest `options`
- refactored TipTap `@voice` and Bubble Menu option loading to asynchronously
  merge static manifest options, dynamic host options, and runtime fallback
  values
- made Bubble Menu dynamic field option requests include the current card voice
  override and inline `@voice` context, so dependent segment fields can resolve
  options from the same provider state used during synthesis

Still pending:

- deepen plugin capability-driven speed/emotion editing beyond the current
  manifest-gated menu flow, including richer field types and provider option
  sources where manifests do not expose enough choices
- verify the expanded fallback bridge against the real iframe host runtime
- update Electron host `mergeTemo` execution to consume the new payload schema
- run full build verification in an environment that has `node` available on
  `PATH`
- apply the documented preload / IPC / host TTS service changes in the real
  Electron host repository, which is not present in `F:\Develop\MemoAITranslate`
  and therefore could not be edited from this workspace session

## File-by-File Checklist

Completed:

- `src/app/lib/tts-plugin.ts`
  - owns plugin-native TTS types, provider metadata helpers, config merge
    helpers, and legacy selection normalization
- `src/app/stores/pluginStore.ts`
  - derives TTS providers from installed plugins and caches runtime TTS form
    state for editor menus
- `src/app/components/business/SelectTTSProvider.tsx`
  - renders plugin providers only
- `src/app/components/business/tts-panel.tsx`
  - renders plugin exposed forms only and previews voices through
    `window.AIM.tts.synthesize(...)`
- `src/app/stores/dataStore.ts`
  - builds generic plugin `mergeTemo` payloads and blocks unresolved legacy
    selections
- `src/app/pages/home/home.tsx`
  - synthesizes with plugin-native `TTSSelection`
- `src/app/components/business/tiptap.tsx`
  - restores plugin-native history selection, attempts legacy rebinding, and
    disables history synthesis while selection is still legacy
- `src/app/components/business/editor-item.tsx`
  - stores card-level voice config as generic plugin selection data
- `src/app/lib/tts-mention/data.ts`
  - builds provider/language/scene/model/voice menus from plugin manifests
- `src/app/lib/tts-mention/use-tts-mention-menu.ts`
  - inserts plugin-native voice mention config
- `src/app/lib/tts-mention/use-tts-bubble-menu.ts`
  - exposes speed/emotion options from plugin editor metadata and optional host
    dynamic field option loading
- `src/app/components/business/tts-menu.tsx`
  - renders plugin-driven `@voice` menu, submenu loading states, and unified
    audition
- `src/app/lib/tts-mention/use-tts-mention-menu.ts`
  - asynchronously loads plugin-driven menu items so custom-component-backed
    plugin fields can still feed TipTap voice selection
- `src/app/components/business/tts-bubble-menu.tsx`
  - renders plugin-gated segment controls for speed/emotion
- `src/app/interface.d.ts`
  - declares plugin-native Electron bridge surface, including optional dynamic
    editor field option lookup
- `src/app/main.tsx`
  - expands iframe fallback bridge with plugin TTS methods

Removed from active codebase:

- `src/app/components/business/edge-config.tsx`
- `src/app/components/business/openAI-config.tsx`
- `src/app/components/business/volcano-config.tsx`
- `src/app/components/business/tts-speed-menu.tsx`
- `src/app/lib/tts-mention/use-tts-speed-menu.ts`
- `src/app/lib/tts-mention/tts-speed.ts`
- `src/app/lib/tts.ts`
- `src/app/lib/volcano.config.ts`

Still pending:

- `src/app/pages/history/history.tsx`
  - needs end-to-end verification against real host return data after plugin
    merge completes
- `src/app/main.tsx`
  - fallback iframe bridge still needs runtime verification with a host that
    actually serves the new plugin APIs
- Electron host project
  - must update preload/main bridge and host-side `mergeTemo` execution to
    consume plugin payloads instead of built-in provider branches

## Legacy Compatibility

The frontend now accepts two persistence generations:

- `schemaVersion: 2` plugin-native selections
- pre-refactor built-in selection shapes that only stored
  `service/speed/target/ttsOptions`

Legacy compatibility rules now implemented:

- old `Edge`, `OpenAI`, and `Volcano` selections are normalized into synthetic
  legacy plugin selections
- legacy selections use synthetic plugin ids such as `legacy:edge-tts`
- legacy selections remain readable in history, card-level voice overrides, and
  inline voice mention config
- when an installed plugin provider matches the normalized provider value, the
  frontend replaces the synthetic `legacy:*` plugin id with the real plugin id
- if no installed plugin can be matched, synthesis is blocked and the user must
  reselect a plugin voice manually

Current legacy mapping assumptions:

- `Edge` -> `Edge TTS`
- `OpenAI` -> `OpenAI TTS`
- `Volcano` / `Volc` -> `Volcengine TTS`

Legacy config normalization currently maps:

- Edge: `language`, `voiceName`, `rate`
- OpenAI: `model`, `voice`, `speed`
- Volcengine: `scene`, `voiceType`, `emotion`

## Dynamic Editor Options

Why this was needed:

- several `MemoAITranslate` TTS plugins expose editable fields like `voiceName`,
  `voiceType`, `scene`, or `emotion` through custom plugin UI components
- those manifests often do not include direct `options` arrays for TipTap to
  consume
- without an extra option source, the plugin-only frontend can render the main
  config form but cannot fully drive `@voice` or segment-level controls inside
  the editor

Frontend support now added:

- static manifest `options` and slider ranges are still used first
- if a field has no direct options, the frontend can ask the host for dynamic
  options via `window.AIM.tts.getPluginEditorOptions(...)`
- if neither static nor dynamic options are available, the frontend falls back
  to the currently active runtime value so existing selection context is still
  preserved

Recommended host API shape:

```ts
window.AIM.tts.getPluginEditorOptions({
  provider: "Edge TTS",
  pluginId: "memo-plugin-tts-edge",
  fieldKey: "voiceName",
  role: "voice",
  scope: "segment",
  config: {
    language: "EN_US"
  },
  query: "jenny"
})
```

Recommended response shape:

```ts
[
  { value: "en-US-JennyNeural", label: "Jenny" },
  { value: "en-US-SteffanNeural", label: "Steffan" }
]
```

Important boundary rule:

- when an option list belongs to a plugin, the source of truth must stay inside
  the plugin package
- the host should forward plugin-owned editor options, not duplicate them in
  `electron-react`
- for the current Volcengine case and the detailed cross-repo fix, see
  `docs/plugin-editor-options-source-of-truth.md`

## Host Coordination Checklist

This frontend refactor is no longer compatible with the previous built-in
provider host contract. The Electron host must be updated together.

Required host behavior:

- `window.AIM.plugin.readLocalPlugins()` must expose TTS plugin providers and
  their manifests
- `window.AIM.tts.synthesize(...)` must preview audio by plugin id
- `window.AIM.tts.getPluginEditorOptions(...)` should return dynamic field
  options for plugin-backed editor controls when the manifest does not include
  plain `options`
- `window.AIM.tts.mergeTemo(...)` must accept the generic plugin payload
  defined by `TTSMergePayload`
- host-side merge execution must resolve `pluginId` and invoke the TTS plugin
  instead of branching on `Edge/OpenAI/Volcano`
- host-side persistence should return the normalized plugin selection in
  `ttsOptions` so newly saved history items no longer fall back to legacy mode

Generic payload shape now sent by the frontend:

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
        voice: "alloy",
        speed: 1
      }
    }
  ]
}
```
