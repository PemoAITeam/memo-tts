import { AllLanguage, ConfigProps, lang, voices } from "@/app/lib/tts"
import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from "../ui/scroll-area";
import { TbVolume } from "react-icons/tb";
import { IoIosFemale, IoIosMale } from "react-icons/io";
import { Separator } from "../ui/separator";
import md5 from "md5";
import { useTranslation } from "react-i18next";

const EdgeConfig = ({ setOptions, getAudition, options }: ConfigProps) => {
    const { t } = useTranslation()
    const [currentLanguage, setCurrentLanguage] = useState<AllLanguage>('ZH_CN')
    const [voiceList, setVoiceList] = useState<any>(voices.filter(v => v.locale.toLowerCase() === currentLanguage.replace(/_/g, '-').toLowerCase()))
    const [voice, setVoice] = useState<any>(voiceList[0])
    useEffect(() => {
        if (setOptions) {
            setOptions({ lang: currentLanguage, voice })
        }
    }, [currentLanguage, voice, setOptions])

    useEffect(() => {
        if (options) {
            setVoice(options.voice)
            if (options.lang) {
                setCurrentLanguage(options.lang)
            }
        }
    }, [options])

    const handleSelectCurrentLanguage = (k: AllLanguage) => {
        setCurrentLanguage(k)
        const filterVoices = voices.filter((v: any) => v.locale.toLowerCase() === k.replace(/_/g, '-').toLowerCase())
        setVoiceList(filterVoices)
        setVoice(filterVoices[0])
    }

    const audition = async (e: any, voice: any) => {
        e.stopPropagation()
        const uuid = md5(`Edge${currentLanguage}${voice?.shortName}Welcome to temo`)
        const params = {
            type: 'Edge',
            lang: currentLanguage,
            rate: 1,
            pitch: 0,
            voiceName: voice?.shortName,
            data: [{ text: 'Welcome to temo', md5: uuid }]
        }
        getAudition && getAudition(params, uuid)
    }

    return (
        <>
            <div className="mb-1 mt-3 text-sm">{t('tts.language')}</div>
            <Select defaultValue={currentLanguage} onValueChange={handleSelectCurrentLanguage}>
                <SelectTrigger value={lang[currentLanguage]} className=" w-auto min-w-36 mr-4">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <ScrollArea className="h-[300px]">
                        {(Object.keys(lang) as AllLanguage[]).map((k) => (
                            <SelectItem value={k} key={k}>
                                {t(`tts.lang.${lang[k]}`)}
                            </SelectItem>
                        ))}
                    </ScrollArea>
                </SelectContent>
            </Select>
            <div className="mb-1 mt-3 text-sm">{t('tts.role')}</div>
            <Separator className="my-2" />
            <div className="voice-type-content">
                {voiceList.map((k: any) => (
                    <div className={`flex items-center mr-4 mb-1 cursor-pointer ${voice.properties.DisplayName === k.properties.DisplayName ? 'text-primary' : ''}`} key={k.properties.DisplayName} onClick={() => setVoice(k)}>
                        <TbVolume className=" mr-3 cursor-pointer" size={18} onClick={(e) => audition(e, k)} />
                        <span>{k.properties.LocalName}</span>
                        {k.properties.Gender == 'Female' && <IoIosFemale className=" ml-1" size={15} />}
                        {k.properties.Gender == 'Male' && <IoIosMale className=" ml-1" size={15} />}
                    </div>
                ))}
            </div>
        </>
    )
}

export default EdgeConfig