import { useCallback, useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import { resultItemString } from "@/lib/utils";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useToast } from "../ui/use-toast";
import { TranslateComplete, TranslateMessage, TranslateProgress, TranslateStart, WhisperSegments } from "@/interface";
import { observer, inject } from "mobx-react";
import SettingStore from "@/stores/settingStore";
import { cloneDeep } from "lodash-es";

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

const langLists = [
    { value: "zh_cn", label: "简体中文" },
    { value: "zh_tw", label: "繁體中文" },
    { value: "yue", label: "粤语" },
    { value: "en", label: "英语" },
    { value: "ja", label: "日本語" },
    { value: "ko", label: "韩语" },
    { value: "fr", label: "法语" },
    { value: "es", label: "西班牙语" },
    { value: "ru", label: "俄语" },
    { value: "de", label: "德语" },
    { value: "it", label: "意大利语" },
    { value: "tr", label: "土耳其语" },
    { value: "pt", label: "葡萄牙语" },
    { value: "vi", label: "越南语" },
    { value: "id", label: "印度尼西亚语" },
    { value: "th", label: "泰语" },
    { value: "ms", label: "马来西亚语" },
    { value: "ar", label: "阿拉伯语" },
    { value: "hi", label: "印地语" },
    { value: "ro", label: "罗马尼亚语" },
    { value: "ug", label: "维吾尔语" },
    { value: "uz", label: "乌兹别克语" },
    { value: "kk", label: "哈萨克语" },
    { value: "az", label: "阿塞拜疆语" },
    { value: "ky", label: "吉尔吉斯语" },
    { value: "fa", label: "波斯语" },
    { value: "tg", label: "塔吉克语" }
]

enum ServiceProvider {
    Google = 'Google',
    Microsoft = 'Microsoft',
    OpenAI = 'openAI',
    Volctrans = 'volctrans',
    DeepL = 'DeepL',
    Ernie = 'ernie',
    Baidu = 'baidu',
    ZhipuAI = 'zhipuAI',
}

const providerList = [
    {
        value: ServiceProvider.Microsoft,
        label: '微软翻译'
    }, {
        value: ServiceProvider.Google,
        label: '谷歌翻译'
    }, {
        value: ServiceProvider.OpenAI,
        label: 'OpenAI'
    }, {
        //   value: ServiceProvider.Ernie,
        //   label: 'preferences.ernie translate',
        //   disabled: true
        // }, {
        value: ServiceProvider.ZhipuAI,
        label: '智谱AI',
    }, {
        value: ServiceProvider.Volctrans,
        label: '火山翻译'
    }, {
        value: ServiceProvider.DeepL,
        label: 'DeepL'
    }, {
        value: ServiceProvider.Baidu,
        label: '百度翻译',
        // }, {
        //     value: ServiceProvider.Baidu,
        //     label: '腾讯翻译君',
    }
]

interface TranslatePanelProps {
    getTranslateData: (data: WhisperSegments[]) => void
    getContent: () => { text?: string }[]
    closePanel?: () => void
    startTranslate?: (value: boolean) => void
    settingStore?: SettingStore
}
declare const window: any;

const TranslatePanel = inject('settingStore')(observer(({ settingStore, closePanel, startTranslate, getContent, getTranslateData }: TranslatePanelProps) => {

    const [provider, setProvider] = useState<{ label: string, value: ServiceProvider }>(providerList[0])
    const [langs] = useState<{ label: string, value: string }[]>(langLists)
    const [lang, setLang] = useState<{ label: string, value: string }>(langLists[0])
    const [translating, setTranslating] = useState<boolean>(false);
    const { toast } = useToast()

    const handler = useCallback((event: any, messageData: TranslateProgress | TranslateComplete | TranslateStart | TranslateMessage) => {
        switch (messageData.type) {
            case 'translate:start':
                console.log(messageData.data.type + '翻译开始', messageData.data);
                break;
            case 'translate:progress':
                console.log('进度：', (messageData.data[0].index + 1) / getContent().length * 100 + '%', messageData.data[0].text);
                break;
            case 'translate:message':
                console.log('翻译消息', messageData.data[0].text);
                break;
            case 'translate:complete':
                console.log(messageData.data.type + '翻译完成', messageData.data);
                break;
        }
    }, [getContent]) // getContent变更时更新 handler

    useEffect(() => {
        window.AIM?.handleMessage(handler, 'MemoTTSTranslateContent') // MemoTTSTranslateContent是唯一标识，可以用于区分不同的消息监听
        
        return () => {
            // 组件销毁时移除事件监听
            window.AIM.removeHandler('MemoTTSTranslateContent')
        }
    }, [handler]) // handler更新时重新注册事件

    const addTranslate = async () => {
        const content = getContent();
        if(!content.length) {
            toast({
                variant: "destructive",
                description: `请先输入内容...`
            })
            return
        }
        if(provider.value !== ServiceProvider.Google && provider.value !== ServiceProvider.Microsoft && !settingStore?.settings[provider.value]) {
            toast({
                variant: "destructive",
                description: `未配置服务，请先在设置面板配置服务...`
            })
            return
        }
        setTranslating(true)
        startTranslate && startTranslate(true)
        const targetLang = lang;
        const options = {
            content: getContent(),
            targetLang
        }
        try {
            closePanel && closePanel()
            const res = await window.AIM.translateContent(cloneDeep(options), cloneDeep(provider.value))
            if (res.status) {
                console.log(res.content);
                let arr
                if (typeof res.content === 'object') {
                    arr = res.content.map((item: any, i: number) => `[${i}]${item.trim()}`)
                } else {
                    arr = res.content.trim().split(/\[\d+\]/).filter(Boolean).map((item: any, i: number) => `[${i}]${item.trim()}`)
                }
                const result = resultItemString(arr, options.content as WhisperSegments[])
                getTranslateData(result)
            }
            setTranslating(false)
            startTranslate && startTranslate(false)
        } catch (error) {
            toast({
                variant: "destructive",
                description: `翻译失败，请检查网络代理再重试...`
            })
            setTranslating(false)
            startTranslate && startTranslate(false)
        }
    }

    const switchProvider = (value: string) => {
        const curProvider = providerList.find(item => item.value === value)
        if (curProvider) {
            setProvider(curProvider)
        }
    }

    const switchLang = (value: string) => {
        const curLang = langLists.find(item => item.value === value);
        if (curLang) {
            setLang(curLang)
        }
    }
    return (
        <>
            <div className="flex items-center mb-3">
                <div className=" mr-3">服务</div>
                <Select onValueChange={switchProvider}>
                    <SelectTrigger className=" w-auto min-w-36 mr-4">
                        <SelectValue placeholder={provider.label} />
                    </SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="h-[200px]">
                            {providerList.map(provider => (
                                <SelectItem key={provider.value} value={provider.value}>
                                    {provider.label}
                                </SelectItem>
                            ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center mb-3">
                <div className=" mr-3">语言</div>
                <Select onValueChange={switchLang}>
                    <SelectTrigger className=" w-auto min-w-36 mr-4">
                        <SelectValue placeholder={lang.label} />
                    </SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="h-[300px]">
                            {langs && langs.map(lang => (
                                <SelectItem disabled={lang.value == 'yue' && provider.value === ServiceProvider.Google} key={lang.value} value={lang.value}>
                                    {lang.label}
                                </SelectItem>
                            ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
            </div>
            <Button className="w-full" onClick={addTranslate}>
                {translating && <AiOutlineLoading3Quarters className='transition-colors ease-linear animate-spin mr-2' size={16} />}
                <span>翻译</span>
            </Button>
        </>
    )
}))

export default TranslatePanel