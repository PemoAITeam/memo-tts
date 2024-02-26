import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from "../ui/scroll-area";
import { TbVolume } from "react-icons/tb";
import { Separator } from "../ui/separator";
import { ConfigProps } from "@/app/lib/tts";
import md5 from "md5";
import { useTranslation } from "react-i18next";

const OpenAISpeaker = [{
    value: "alloy",
    label: "alloy"
}, {
    value: "echo",
    label: "echo"
}, {
    value: "fable",
    label: "fable"
}, {
    value: "onyx",
    label: "onyx"
}, {
    value: "nova",
    label: "nova"
}, {
    value: "shimmer",
    label: "shimmer"
}]
const OpenAIConfig = ({ setOptions, getAudition }: ConfigProps) => {
    const [model, setModel] = useState<'tts-1-hd' | 'tts-1'>('tts-1')
    const [voice, setVoice] = useState<any>({ value: "alloy", label: "alloy" })
    const { t } = useTranslation()
    useEffect(() => {
        if (setOptions) {
            setOptions({ model, voice })
        }
    }, [model, voice, setOptions])

    const handelModel = (model: 'tts-1-hd' | 'tts-1') => {
        setModel(model)
    }

    const audition = async (e: any, voice: any) => {
        e.stopPropagation()
        const uuid = md5(`OpenAI${model}${voice?.value}Welcome to temo`)
        const params = {
            type: 'OpenAI',
            model,
            speed: 1,
            voiceName: voice?.value,
            data: [{ text: 'Welcome to temo', md5: uuid }]
        }
        getAudition && getAudition(params, uuid)
    }

    return (
        <>
            <div className="mb-1 mt-3 text-sm">{t('tts.model')}</div>
            <Select onValueChange={handelModel}>
                <SelectTrigger className=" w-auto min-w-36 mr-4">
                    <SelectValue placeholder={model} />
                </SelectTrigger>
                <SelectContent>
                    <ScrollArea className="h-[300px]">
                        <SelectItem value="tts-1">
                            tts-1
                        </SelectItem>
                        <SelectItem disabled={true} value="tts-1-hd">
                            tts-1-hd
                        </SelectItem>
                    </ScrollArea>
                </SelectContent>
            </Select>
            <div className="mb-1 mt-3 text-sm">{t('tts.role')}</div>
            <Separator className="my-2" />
            <div className="voice-type-content">
                {OpenAISpeaker.map((v: { value: string, label: string }) => (
                    <div className={`flex items-center mr-4 mb-1 cursor-pointer ${voice.value === v.value ? ' text-primary' : ''}`} key={v.value} onClick={() => { setVoice(v) }}>
                        <TbVolume className=" cursor-pointer mr-3" size={18} onClick={(e) => audition(e, v)} />
                        <span>{v.label}</span>
                    </div>
                ))}
            </div>
        </>
    )
}

export default OpenAIConfig