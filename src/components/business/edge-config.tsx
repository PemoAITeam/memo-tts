import { AllLanguage, ConfigProps, lang, voices } from "@/lib/tts"
import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from "../ui/scroll-area";
import { TbVolume } from "react-icons/tb";
import { IoIosFemale, IoIosMale } from "react-icons/io";
import { Separator } from "../ui/separator";
import md5 from "md5";

const EdgeConfig = ({ setOptions, getAudition }: ConfigProps) => {
    const [currentLanguage, setCurrentLanguage] = useState<AllLanguage>('ZH_CN')
    const [voiceList, setVoiceList] = useState<any>(voices.filter(v => v.locale.toLowerCase() === currentLanguage.replace(/_/g, '-').toLowerCase()))
    const [voice, setVoice] = useState<any>(voiceList[0])
    const [voiceSex, setVoiceSex] = useState<{ value: 'Male' | 'Female' | 'All', text: '全部' | '男' | '女' }>({ value: 'All', text: '全部' })

    useEffect(() => {
        if (setOptions) {
            setOptions({ lang: currentLanguage, voice })
        }
    }, [currentLanguage, voice, setOptions])

    const handleSelectCurrentLanguage = (k: AllLanguage) => {
        setCurrentLanguage(k)
        const filterVoices = voiceSex.value == 'All' ? voices.filter(v => v.locale.toLowerCase() === k.replace(/_/g, '-').toLowerCase()) :
            voices.filter((v: any) => v.locale.toLowerCase() === k.replace(/_/g, '-').toLowerCase()).filter((v: any) => v.properties.Gender == voiceSex.value)
        setVoiceList(filterVoices)
        setVoice(filterVoices[0])
    }

    const handelVoiceSex = (value: 'Male' | 'Female' | 'All') => {
        const sex: any = value == 'All' ? { text: '全部', value: 'All' } : value == 'Female' ? { text: '女', value: 'Female' } : { text: '男', value: 'Male' }
        setVoiceSex(sex);
        const filterVoices = value == 'All' ? voices.filter((v: any) => v.locale.toLowerCase() === currentLanguage.replace(/_/g, '-').toLowerCase()) :
            voices.filter((v: any) => v.locale.toLowerCase() === currentLanguage.replace(/_/g, '-').toLowerCase()).filter((v: any) => v.properties.Gender == sex.value)
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
            <div className="mb-1 mt-3 text-sm">语言</div>
            <Select defaultValue={currentLanguage} onValueChange={handleSelectCurrentLanguage}>
                <SelectTrigger value={lang[currentLanguage]} className=" w-auto min-w-36 mr-4">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <ScrollArea className="h-[300px]">
                        {(Object.keys(lang) as AllLanguage[]).map((k) => (
                            <SelectItem value={k} key={k}>
                                {lang[k]}
                            </SelectItem>
                        ))}
                    </ScrollArea>
                </SelectContent>
            </Select>
            <div className="mb-1 mt-3 text-sm">性别</div>
            <Select defaultValue={voiceSex.value} onValueChange={handelVoiceSex}>
                <SelectTrigger value={voiceSex.text} className=" w-auto min-w-36 mr-4">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value='All'>
                        全部
                    </SelectItem>
                    <SelectItem value='Male'>
                        男
                    </SelectItem>
                    <SelectItem value='Female'>
                        女
                    </SelectItem>
                </SelectContent>
            </Select>
            <div className="mb-1 mt-3 text-sm">角色</div>
            <Separator className="my-2" />
            <div className="voice-type-content">
                {voiceList.map((k: any) => (
                    <div className={`flex items-center mr-4 mb-1 cursor-pointer ${voice.properties.DisplayName === k.properties.DisplayName ? 'text-purple-500' : ''}`} key={k.properties.DisplayName} onClick={() => setVoice(k)}>
                        <TbVolume className=" mr-3 cursor-pointer" size={18} onClick={(e) => audition(e, k)} />
                        <span>{k.properties.LocalName}</span>
                        {k.properties.Gender == 'Female' && <IoIosFemale className=" ml-1" size={15} />}
                        {k.properties.Gender == 'Male' && <IoIosMale className=" ml-1" size={15} />}
                    </div>
                ))}
            </div>
            {/* <Select onValueChange={handelVoice}>
                <SelectTrigger className=" w-auto min-w-36 mr-4">
                    <SelectValue placeholder={defaultVoice} />
                </SelectTrigger>
                <SelectContent>
                    <ScrollArea className="h-[300px]">
                        {voiceList.map((k: any) => (
                            <SelectItem value={k.properties.DisplayName} key={k.properties.DisplayName}>
                                {k.properties.LocalName}
                            </SelectItem>
                        ))}
                    </ScrollArea>
                </SelectContent>
            </Select> */}
        </>
    )
}

export default EdgeConfig