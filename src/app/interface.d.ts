import type { TTSMergePayload, TTSSelection } from "./lib/tts-plugin";
type AllLanguage = string;

declare global {
  interface Window {
    AIM: AIMBridge;
  }
}

interface AIMBridge {
  isWindows?: boolean;
  isMac?: boolean;
  getSetting: () => Promise<AppSettings>;
  openDialog: (...args: any[]) => Promise<any>;
  handleMessage: (handler: (...args: any[]) => void, key: string) => void;
  removeHandler: (key: string) => void;
  file?: {
    checkFileExist?: (path: string) => Promise<boolean>;
  };
  plugin: {
    readLocalPlugins: () => Promise<any>;
    saveConfiguration: (pluginId: string, formData: Record<string, any>) => Promise<any>;
    getProviders?: (type: string) => Promise<any>;
  };
  tts: {
    getTemoData: () => Promise<TemoData[]>;
    updateTemoData: (data: TemoData[]) => Promise<any>;
    deleteTemoData: (ids: string[]) => Promise<any>;
    getTemoLibrary: () => Promise<LibraryData[]>;
    saveTemoLibrary: (data: LibraryData[]) => Promise<any>;
    copyTemoFile: (path: string, scope: string) => Promise<any>;
    mergeTemo: (payload: TTSMergePayload, uuid: string, extra: Record<string, any>) => Promise<TemoData>;
    abortMergeTemo: () => Promise<any> | void;
    getTemoAudition?: (...args: any[]) => Promise<any>;
    synthesize?: (payload: {
      provider: string;
      pluginId: string;
      text: string;
      options?: Record<string, any>;
      returnBuffer?: boolean;
    }) => Promise<any>;
    getPluginEditorOptions?: (payload: {
      provider: string;
      pluginId: string;
      fieldKey: string;
      role?: string;
      scope?: string;
      config?: Record<string, any>;
      query?: string;
    }) => Promise<any[]>;
    renderMedia: (...args: any[]) => Promise<any>;
    temoDownload: (...args: any[]) => Promise<any>;
  };
}

interface WhisperSegments {
  st?: string;
  et?: string;
  text: string;
  index?: number;
  delete?: boolean;
  cut?: boolean;
  children?: Array<WhisperSegments>;
  md5?: string;
}

export interface AppSettings {
  openAI?: {
    apiKey: string;
    host?: string;
    model: CompletionCreateParams["model"];
  };
  ernie?: {
    apiKey: string;
    secretKey: string;
    accessToken?: {
      refresh_token: string;
      expires_in: number;
      access_token: number;
      scope: string;
      session_secret: string;
      create_at: number;
    };
  };
  zhipuAI?: {
    apiKey: string;
    accessToken?: {
      refresh_token: string;
      expires_in: number;
      access_token: number;
      scope: string;
      session_secret: string;
      create_at: number;
    };
  };
  baidu?: {
    apiKey: string;
    secretKey: string;
    accessToken?: {
      refresh_token: string;
      expires_in: number;
      access_token: number;
      scope: string;
      session_secret: string;
      create_at: number;
    };
  };
  showWelcome?: "0" | "1";
  themeSource?: typeof nativeTheme.themeSource;
  macOSWhisperMode?: "CPU" | "coreML" | "CLBlast" | "Metal";
  windowsWhisperMode?: "CPU" | "GPU" | "CUDA" | "cuBLAS";
  language?: string;
  httpProxy?: {
    port?: number;
    host?: string;
  };
  proxy?: {
    type: "none" | "system" | "custom";
    proxy?: Array<{
      type?: "http" | "socks5";
      active?: boolean;
      port?: number;
      hostname?: string;
    }>;
  };
  volctrans?: {
    accessKeyId: string;
    secretKey: string;
  };
  DeepL?: {
    freeApi: boolean;
    authKey: string;
  };
  notion?: {
    secretKey?: string;
    pageId?: string;
  };
  modelDir?: string;
  embeddingModelDir?: string;
  downloadService?: string;
  vad?: {
    enabled: boolean;
    mode: "0" | "1" | "2";
    threshold: number;
    minSilenceDuration: number;
    autoRemoveCutAudio: boolean;
  };
  tts?: {
    volctrans?: {
      accessToken: string;
      appId: string;
    };
  };
  externalResourceMode?: "0" | "1" | "2";
  enableRSS?: boolean;
  enableCoreML?: boolean;
  useSubtitleWindow?: boolean;
}

export interface TemoData {
  dest?: string;//存储文件夹
  fileUrl?: string;//文件地址
  infoData?: Record<string, { fileDest: string, metadata: Record<string, any>, text: string } | string[]>;
  lang?: AllLanguage;
  metadata?: Record<string, any>;
  title: string;
  uuid: string;
  voiceLocalName?: string;
  voiceName?: string;
  date?: number;
  duration?: string;
  editorData?: EditorData[];
  type?: 'audio' | 'video';
  fileList: TemoFileList[],
  ttsOptions: TTSSelection | any,
  fileDuration: number,
}

export interface TemoFileList {
  fileDest: string,
  metadata: any,
  text: string,
  from?: number,
  duration?: number
}

export interface EditorData {
  content?: { type: "text", text: string }[],
  attrs?: Record<string, any>,
  type: "editorCard"
}

export interface LibraryData {
  name: string,
  path: string
  type: 'media'
  duration?: string
}
