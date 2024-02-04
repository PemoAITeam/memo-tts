import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";

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
    OpenAI = 'OpenAI',
    Volctrans = 'Volctrans',
    DeepL = 'DeepL',
    Ernie = 'Ernie',
    Baidu = 'Baidu',
    ZhipuAI = 'ZhipuAI',
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
    getTranslateData: (data: string) => void,
    getContent: () => {text: string}[],
}
declare const window: any;

const TranslatePanel = ({ getContent, getTranslateData }: TranslatePanelProps) => {

    const [provider, setProvider] = useState<{ label: string, value: ServiceProvider }>(providerList[0])
    const [langs, setLangs] = useState<{ label: string, value: string }[]>(langLists)
    const [lang, setLang] = useState<{ label: string, value: string }>(langLists[0])

    const addTranslate = async () => {
        const targetLang = lang;
        const options = {
            content: getContent(),
            targetLang
        }
        console.log(options, provider.value)
        window.AIM.translateContent(options, provider.value)
        window.AIM?.handleMessage((event: any, data: any) => {
            console.log(data)
        })
        // const translateData = res.content[0] || ''
        // getTranslateData(translateData)
        // const jsonData = editor.getJSON();
        // if (jsonData.content) {
        //     const index = jsonData.content?.findIndex(item => item.attrs?.id == node.attrs.id)
        //     if (index > -1) {
        //         const list = [...jsonData.content.slice(0, index + 1), { type: 'translateCard', attrs: { id: generateUUID() }, content: [{ type: 'text', text: translateData }] }, ...jsonData.content.slice(index + 1)];
        //         console.log(list)
        //         editor.chain().setContent({ type: 'doc', content: list }).focus().run()
        //     }
        // }
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
                                <SelectItem key={lang.value} value={lang.value}>
                                    {lang.label}
                                </SelectItem>
                            ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
            </div>
            <Button className="w-full" onClick={addTranslate}>翻译</Button>
        </>
    )
}

export default TranslatePanel