export type PartialByKey<T, K extends keyof T> = Omit<T, K> &
    Partial<Pick<T, K>>;

export type RequiredByKey<T, K extends keyof T> = Omit<T, K> &
    Required<Pick<T, K>>;

export type AllServiceType = "OpenAI" | "Google" | "Baidu" | "Ernie" | "ZhipuAI" | 'Microsoft' | 'Volctrans' | 'DeepL'

export type LanguageCode =
    | "auto" // 自动检测
    | "zh_cn" // 简体中文
    | "zh_tw" // 繁體中文
    | "yue" // 粤语
    | "en" // 英语
    | "ja" // 日语
    | "ko" // 韩语
    | "fr" // 法语
    | "es" // 西班牙语
    | "ru" // 俄语
    | "de" // 德语
    | "it" // 意大利语
    | "tr" // 土耳其语
    | "pt" // 葡萄牙语
    | "vi" // 越南语
    | "id" // 印度尼西亚语
    | "th" // 泰语
    | "ms" // 马来西亚语
    | "ar" // 阿拉伯语
    | "hi" // 印地语(印度的官方语言)
    | "ro" // 罗马尼亚语
    | "ug" // 维吾尔语
    | "uz" // 乌兹别克语
    | "kk" // 哈萨克语
    | "az" // 阿塞拜疆语
    | "ky" // 吉尔吉斯语
    | "fa" // 波斯语
    | "tg"; // 塔吉克语

export type SupportProviders =
    | "none"
    | "Google"
    | "ZhipuAI"
    | "OpenAI"
    | "Microsoft"
    | "Volctrans"
    | "Ernie"
    | "Baidu"
    | "DeepL";

export interface SettingChange {
    type: "setting:change";
    data: Record<string, any>;
}