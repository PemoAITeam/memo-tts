import { AllLanguage } from "./lib/tts";
import { AllServiceType, RequiredByKey } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    AIM: any;
  }
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



interface TranslateStart {
  type: "translate:start";
  data: {
    type: AllServiceType;
    message: string;
  };
}

interface TranslateProgress {
  type: "translate:progress";
  data: RequiredByKey<Partial<WhisperSegments>, "index">[];
}

interface TranslateMessage {
  type: "translate:message";
  data: RequiredByKey<Partial<WhisperSegments>, "index">[];
}

interface TranslateComplete {
  type: "translate:complete";
  data: {
    type: AllServiceType;
    result: TranslateResult;
  };
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
  translateProvider?: SupportProviders;
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
  useMultiTranslate?: boolean;
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
  bgm?: BgmData;
  type?: 'audio' | 'video';
  fileList: TemoFileList[],
  ttsOptions: any,
  fileDuration: number,
}

export interface BgmData {
  name: string,
  path: string,
  duration: number
}

export interface TemoFileList {
  fileDest: string,
  metadata: any,
  text: string,
  pic?: { name: string, path: string },
  from?: number,
  duration?: number
}

export interface EditorData {
  content?: { type: "text", text: string }[],
  attrs?: Record<string, any>,
  type: "editorCard" | "translateCard"
}

export interface LibraryData {
  name: string,
  path: string
  type: 'pic' | 'media'
  duration?: string
}