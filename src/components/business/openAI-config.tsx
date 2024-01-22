import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ScrollArea } from "../ui/scroll-area";
import { TbVolume } from "react-icons/tb";
import { Separator } from "../ui/separator";

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
const OpenAIConfig = () => {
    const [model, setModel] = useState<'tts-1-hd' | 'tts-1'>('tts-1-hd')
    const [, setVoice] = useState<any>({value: "alloy", label: "alloy"})

    return (
        <>
            <div className="mb-1 mt-3 text-sm">模型</div>
            <Select>
                <SelectTrigger className=" w-auto min-w-36 mr-4">
                    <SelectValue placeholder={model} />
                </SelectTrigger>
                <SelectContent>
                    <ScrollArea className="h-[300px]">
                        <SelectItem value="tts-1-hd" onSelect={() => { setModel('tts-1-hd') }}>
                            tts-1-hd
                        </SelectItem>
                        <SelectItem value="tts-1" onSelect={() => { setModel('tts-1') }}>
                            tts-1
                        </SelectItem>
                    </ScrollArea>
                </SelectContent>
            </Select>
            <div className="mb-1 mt-3 text-sm">角色</div>
            <Separator className="my-2" />
            <div>
                {OpenAISpeaker.map((v: {value: string, label: string}) => (
                    <div className="flex items-center mr-4 mb-1" key={v.value} onClick={() => {setVoice(v)}}>
                        <TbVolume className=" cursor-pointer mr-3" size={18} />
                        <span>{v.label}</span>
                    </div>
                ))}
            </div>
        </>
    )
}

export default OpenAIConfig