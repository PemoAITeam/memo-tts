import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import EdgeConfig from "./edge-config"
import OpenAIConfig from "./openAI-config"
import VolcanoConfig from "./volcano-config"
import { getLocalFileUrl } from "@/lib/utils"

interface TTSPanelProps {
    speed?: string,
    setOptions: (data: any) => void
    getService: (service: "Edge" | "OpenAI" | "Volcano") => void;
}

const TTSPanel = ({ speed, setOptions, getService }: TTSPanelProps) => {

    // const [options, setOptions] = useState<TTSOptions>()
    const [service, setService] = useState<'Edge' | 'OpenAI' | 'Volcano'>('Edge')
    const [curPlay, setCurPlay] = useState<any>();
    const handleService = (e: 'Edge' | 'OpenAI' | 'Volcano') => {
        setService(e)
        getService(e)
    }

    let audioPlayer: HTMLAudioElement | null;
    const playAudio = (item: any, isAudition?: boolean, event?: any) => {
        if (event) {
            event.stopPropagation();
        }
        if (curPlay?.fileUrl === item.fileUrl && !isAudition) {
            handleEnded()
        } else {
            if (audioPlayer) {
                audioPlayer.pause()
                audioPlayer?.removeEventListener('ended', handleEnded);
            }
            setCurPlay(item);
            setTimeout(() => {
                audioPlayer = document.getElementById('auditionPlayer') as HTMLAudioElement;
                audioPlayer.load();
                audioPlayer.play();
                if (!isAudition) {
                    audioPlayer.addEventListener('ended', handleEnded);
                }
            })
        }
    }

    const handleEnded = () => {
        console.log('Audio playback stopped');
        // 在这里执行播放结束后的逻辑
        // 移除事件监听器
        audioPlayer?.removeEventListener('ended', handleEnded);
        setCurPlay(null)
        audioPlayer = null;
    };
    const audition = async (params: any, uuid: string) => {
        console.log(params)
        if (params.type === 'Edge') {
            params.rate = speed || 0
        } else if (params.type === 'OpenAI') {
            params.speed = speed || 0
        }
        const fileUrl = await window.AIM.getTemoAudition(params, uuid);
        if (fileUrl) {
            playAudio({ fileUrl }, true)
        }
    }

    return (
        <>
            <div className="mb-1 text-sm">服务</div>
            <Select defaultValue={service} onValueChange={handleService}>
                <SelectTrigger className=" w-auto min-w-36 mr-4">
                    <SelectValue placeholder={service} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value='OpenAI'>
                        Open AI
                    </SelectItem>
                    <SelectItem value='Edge'>
                        Edge
                    </SelectItem>
                    <SelectItem value='Volcano'>
                        Volcano
                    </SelectItem>
                </SelectContent>
            </Select>
            {service === 'Edge' && <EdgeConfig setOptions={setOptions} getAudition={audition} />}
            {service === 'OpenAI' && <OpenAIConfig setOptions={setOptions} getAudition={audition} />}
            {service === 'Volcano' && <VolcanoConfig setOptions={setOptions} getAudition={audition} />}
            {curPlay?.fileUrl && <audio id="auditionPlayer" controls>
                <source src={getLocalFileUrl(curPlay?.fileUrl)} type="audio/wav" />
            </audio>}
        </>
    )
}

export default TTSPanel