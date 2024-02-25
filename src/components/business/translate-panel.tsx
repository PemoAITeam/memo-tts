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
import { useTranslation } from "react-i18next";
import { translateLangs } from "@/locales";

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
        label: 'translate.providers.microsoft'
    }, {
        value: ServiceProvider.Google,
        label: 'translate.providers.google'
    }, {
        value: ServiceProvider.OpenAI,
        label: 'translate.providers.openAI'
    }, {
        //   value: ServiceProvider.Ernie,
        //   label: 'preferences.ernie translate',
        //   disabled: true
        // }, {
        value: ServiceProvider.ZhipuAI,
        label: 'translate.providers.zhipuAI',
    }, {
        value: ServiceProvider.Volctrans,
        label: 'translate.providers.volctrans',
    }, {
        value: ServiceProvider.DeepL,
        label: 'translate.providers.deepL',
    }, {
        value: ServiceProvider.Baidu,
        label: 'translate.providers.baidu',
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
    const [langs] = useState<{ label: string, value: string }[]>(translateLangs)
    const [lang, setLang] = useState<{ label: string, value: string }>(translateLangs[0])
    const [translating, setTranslating] = useState<boolean>(false);
    const { toast } = useToast()
    const { t } = useTranslation()
    const handler = useCallback((_event: any, messageData: TranslateProgress | TranslateComplete | TranslateStart | TranslateMessage) => {
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
                description: t('translate.first input')
            })
            return
        }
        if(provider.value !== ServiceProvider.Google && provider.value !== ServiceProvider.Microsoft && !settingStore?.settings[provider.value]) {
            toast({
                variant: "destructive",
                description: t('translate.set service')
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
                description: t('translate.translate fail')
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
        const curLang = translateLangs.find(item => item.value === value);
        if (curLang) {
            setLang(curLang)
        }
    }
    return (
        <>
            <div className="flex items-center mb-3">
                <div className=" mr-3">{t('translate.provider')}</div>
                <Select onValueChange={switchProvider}>
                    <SelectTrigger className=" w-auto min-w-36 mr-4">
                        <SelectValue placeholder={t(provider.label)} />
                    </SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="h-[200px]">
                            {providerList.map(provider => (
                                <SelectItem key={provider.value} value={provider.value}>
                                    {t(provider.label)}
                                </SelectItem>
                            ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center mb-3">
                <div className=" mr-3">{t('translate.language')}</div>
                <Select onValueChange={switchLang}>
                    <SelectTrigger className=" w-auto min-w-36 mr-4">
                        <SelectValue placeholder={t(lang.label)} />
                    </SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="h-[300px]">
                            {langs && langs.map(lang => (
                                <SelectItem disabled={lang.value == 'yue' && provider.value === ServiceProvider.Google} key={lang.value} value={lang.value}>
                                    {t(lang.label)}
                                </SelectItem>
                            ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
            </div>
            <Button className="w-full" onClick={addTranslate}>
                {translating && <AiOutlineLoading3Quarters className='transition-colors ease-linear animate-spin mr-2' size={16} />}
                <span>{t('translate.translate')}</span>
            </Button>
        </>
    )
}))

export default TranslatePanel