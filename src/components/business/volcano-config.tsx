import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from "../ui/scroll-area";
import { ScenesType, VolcanoEmotion, VolcanoSceneEmotion, VolcanoScenes, VolcanoVoiceType } from "../../lib/volcano.config";
import { Separator } from "../ui/separator";
import { TbVolume } from "react-icons/tb";
import { IoIosFemale, IoIosMale } from "react-icons/io";
import md5 from "md5";
import { ConfigProps } from "@/lib/tts";

const VolcanoConfig = ({ setOptions, getAudition }: ConfigProps) => {
    const [scenes, setScenes] = useState<ScenesType>('common')
    const [emotion, setEmotion] = useState<{ label: string, value: string } | null>({ label: '无', value: 'none' })
    const [voiceGender, setVoiceGender] = useState<{ value: 'male' | 'female' | 'all', text: '全部' | '男' | '女' }>({ value: 'all', text: '全部' })
    const [voiceList, setVoiceList] = useState<any>(VolcanoVoiceType[scenes])
    const [voice, setVoice] = useState<{ label: string, value: string, gender: string }>(voiceList[0])

    useEffect(() => {
        if (setOptions) {
            setOptions({ emotion: emotion?.value === 'none' ? '' : emotion?.value, voice, scenes })
        }
    }, [scenes, voice, emotion, setOptions])

    const audition = async (e: any, voice: any) => {
        e.stopPropagation()
        const uuid = md5(`Volc${scenes}${emotion?.value}${voice?.value}Welcome to temo`)
        const params = {
            type: 'Volc',
            emotion: emotion?.value === 'none' ? '' : emotion?.value,
            voice_type: voice.value,
            scene: scenes,
            data: [{ text: 'Welcome to temo', md5: uuid }]
        }
        getAudition && getAudition(params, uuid)
    }

    const handleScenes = (value: ScenesType) => {
        setScenes(value);
        const emotion = VolcanoSceneEmotion[value] ? VolcanoSceneEmotion[value][0] : null
        getVoices(value, emotion, voiceGender)
    }

    const handelVoiceGender = (value: 'male' | 'female' | 'all') => {
        const gender: any = value == 'all' ? { text: '全部', value: 'all' } : value == 'female' ? { text: '女', value: 'female' } : { text: '男', value: 'male' }
        setVoiceGender(gender);
        getVoices(scenes, emotion, gender)
    }

    const handleEmotion = (value: string) => {
        const emotion = VolcanoSceneEmotion[scenes].find((item: any) => item.value === value)
        setEmotion(emotion)
        getVoices(scenes, emotion, voiceGender)
    }

    const getVoices = (scenes: ScenesType, emotion: { label: string, value: string } | null, gender: { value: 'male' | 'female' | 'all', text: '全部' | '男' | '女' }) => {
        const hasEmotionLists = VolcanoSceneEmotion[scenes] ? VolcanoVoiceType[scenes].filter(item => VolcanoEmotion[item.value] && !!VolcanoEmotion[item.value].find((e: any) => e.value === emotion?.value)) : []
        const filterVoices = !emotion || emotion.value === 'none' ? VolcanoVoiceType[scenes].filter((v: any) => gender.value === 'all' || v.gender == gender.value) :
            hasEmotionLists.filter((v: any) => gender.value === 'all' || v.gender == gender.value)
        setVoiceList(filterVoices)
    }

    const handleVoice = (value: { label: string, value: string, gender: string, emotion?: string }) => {
        setVoice(value)
        const hasEmotion = VolcanoSceneEmotion[scenes]?.find((item: any) => item.value === emotion?.value)
        if(!hasEmotion) {
            const emotion = VolcanoSceneEmotion[scenes] ? VolcanoSceneEmotion[scenes][0] : null
            setEmotion(emotion)
        }
    }

    return (
        <>
            <div className="mb-1 mt-3 text-sm">场景</div>
            <Select defaultValue={scenes} onValueChange={handleScenes}>
                <SelectTrigger className=" w-auto min-w-36 mr-4">
                    <SelectValue placeholder={scenes} />
                </SelectTrigger>
                <SelectContent>
                    <ScrollArea className="h-[300px]">
                        {VolcanoScenes.map((item: { value: ScenesType, label: string }) => (
                            <SelectItem value={item.value} key={item.value}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </ScrollArea>
                </SelectContent>
            </Select>
            {VolcanoSceneEmotion[scenes] && <>
                <div className="mb-1 mt-3 text-sm">选择感情</div>
                <Select onValueChange={handleEmotion}>
                    <SelectTrigger className=" w-auto min-w-36 mr-4">
                        <SelectValue placeholder={emotion?.label} />
                    </SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="h-[300px]">
                            {VolcanoSceneEmotion[scenes].map((v: { value: string, label: string }) => (
                                <SelectItem value={v.value} key={v.value}>
                                    {v.label}
                                </SelectItem>
                            ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
            </>}
            <div className="mb-1 mt-3 text-sm">性别</div>
            <Select defaultValue={voiceGender.value} onValueChange={handelVoiceGender}>
                <SelectTrigger value={voiceGender.text} className=" w-auto min-w-36 mr-4">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value='all'>
                        全部
                    </SelectItem>
                    <SelectItem value='male'>
                        男
                    </SelectItem>
                    <SelectItem value='female'>
                        女
                    </SelectItem>
                </SelectContent>
            </Select>
            <div className="mb-1 mt-3 text-sm">角色</div>
            <Separator className="my-2" />
            {voiceList.length ?
                <div className="valcano-voice-content">
                    {voiceList.map((v: any) => (
                        <div className={`flex items-center mr-4 mb-1 cursor-pointer ${voice.value === v.value ? ' text-purple-500' : ''}`} key={v.value} onClick={() => handleVoice(v)}>
                            <TbVolume className=" cursor-pointer mr-3" size={18} onClick={(e) => audition(e, v)} />
                            <span>{v.label}</span>
                            {v.gender == 'female' && <IoIosFemale className=" ml-1" size={15} />}
                            {v.gender == 'male' && <IoIosMale className=" ml-1" size={15} />}
                        </div>
                    ))} </div> : <div className=" text-sm h-16 flex items-center justify-center">暂无角色</div>}

        </>
    )
}

export default VolcanoConfig