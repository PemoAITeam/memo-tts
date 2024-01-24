import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from "../ui/scroll-area";
import { ScenesType, VolcanoMeotion, VolcanoScenes, VolcanoVoiceType } from "../../lib/volcano.config";
import { Separator } from "../ui/separator";
import { TbVolume } from "react-icons/tb";
import { IoIosFemale, IoIosMale } from "react-icons/io";

const VolcanoConfig = () => {
    const [scenes] = useState<ScenesType>('common')
    const [voice, setVoice] = useState<{ label: string, value: string, gender: 'female' | 'male' }>({ value: "BV700_V2_streaming", label: "灿灿 2.0", gender: 'female' })
    const [emotion, setEmotion] = useState<{ label: string, value: string }>({ "label": "愉悦", "value": "pleased" })

    return (
        <>
            <div className="mb-1 mt-3 text-sm">场景</div>
            <Select defaultValue={scenes}>
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
            {VolcanoMeotion[voice.value]?.length && <>
                <div className="mb-1 mt-3 text-sm">选择感情</div>
                <Select>
                    <SelectTrigger className=" w-auto min-w-36 mr-4">
                        <SelectValue placeholder={emotion.label} />
                    </SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="h-[300px]">
                            {VolcanoMeotion[voice.value].map((v: { value: string, label: string }) => (
                                <SelectItem value={v.value} key={v.value} onSelect={() => { setEmotion({ ...v }) }}>
                                    {v.label}
                                </SelectItem>
                            ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
            </>}
            <div className="mb-1 mt-3 text-sm">角色</div>
            <Separator className="my-2" />
            <div className="valcano-voice-content">
                {VolcanoVoiceType[scenes].map((v: any) => (
                    <div className={`flex items-center mr-4 mb-1 cursor-pointer ${voice.value === v.value ? ' text-purple-500' : ''}`} key={v.value} onClick={() => setVoice(v)}>
                        <TbVolume className=" cursor-pointer mr-3" size={18} />
                        <span>{v.label}</span>
                        {v.gender == 'female' && <IoIosFemale className=" ml-1" size={15} />}
                        {v.gender == 'male' && <IoIosMale className=" ml-1" size={15} />}
                    </div>
                ))}
            </div>
        </>
    )
}

export default VolcanoConfig