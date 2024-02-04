/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    AIM: any;
  }
}

interface WhisperSegments {
  st: string;
  et: string;
  text: string;
  index?: number;
  delete?: boolean;
  cut?: boolean;
  children?: Array<WhisperSegments>;
  md5?: string;
}

type PartialByKey<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

type RequiredByKey<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

type AllServiceType = "OpenAI" | "Google" | "Baidu" | "Ernie" | "ZhipuAI" | 'Microsoft' | 'Volctrans' | 'DeepL'

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