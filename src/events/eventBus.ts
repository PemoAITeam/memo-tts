import mitt, { type Emitter } from "mitt";

type PlayerSpeedUpdate = Record<string, any>
type PlayerTimeUpdate = Record<string, any>
type WhisperSegments = Record<string, any>
type RendererMessage = {
  event?: unknown
  ipcData?: any
}
type SearchIndexChange = Record<string, any>

export const customEvents = {
  PlayerSeek: "player:seek",
  PlayerSeekTo: "player:seek:to",
  PlayerSpeed: "player:speed",
  PlayerSetVolume: "player:set:volume",
  PlayerPlay: "player:play",
  PlayerTimeupdate: "player:timeupdate",
  PlayerStop: "player:stop",
  PlayerPause: "player:pause",
  PlayerSubUpdateStart: "player:sub:update:start",
  PlayerSubUpdate: "player:sub:update",
  PlayerSubUpdateEnd: "player:sub:update:end",
  SearchIndexChange: "search:index:change",
  SubtitleSettingShow: "subtitle:setting:show",
  CancelTranscript: "cancel:transcript",
  Develop: "under:development",
  ShowWelcome: "show:welcome",
  ShowSettings: "show:settings",
  HistorySelectFile: "history:selectFile",
  CommandToggle: "command:toggle",

  PreferenceChangeTabTo: "preference:change:tab:to",
  PreferenceShow: "preference:show",

  onUpdateSubStart: "onUpdateSubStart",
  onUpdateSub: "onUpdateSub",
  onUpdateSubEnd: "onUpdateSubEnd",
  onRemoveSub: "onRemoveSub",
  changeTrackSub: "changeTrackSub",
  removeTrackSub: "removeTrackSub",
  revertTrackSub: "revertTrackSub",
  addTrackSub: "addTrackSub",

  ToastError: "toast:error",

  RendererMessage: "renderer:message",
} as const;

type CustomEvents = typeof customEvents

type ValueOf = CustomEvents[keyof CustomEvents]

export type ActionData = WhisperSegments | PlayerTimeUpdate | SearchIndexChange | PlayerSpeedUpdate | RendererMessage | Record<string, any>

export type EmitterEvents = Record<ValueOf, ActionData>

export const eventBus: Emitter<EmitterEvents> = mitt<EmitterEvents>();
