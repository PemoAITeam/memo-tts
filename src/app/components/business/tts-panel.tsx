import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import EdgeConfig from "./edge-config"
import OpenAIConfig from "./openAI-config"
import VolcanoConfig from "./volcano-config"
import { getLocalFileUrl } from "@/app/lib/utils"
import { inject, observer } from "mobx-react"
import SettingStore from "@/app/stores/settingStore"
import { useTranslation } from "react-i18next"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"
import { TTSOptions } from "@/app/lib/tts"
import { Button } from "../ui/button"
export interface VoiceOptions {
    ttsOptions?: TTSOptions
    service?: 'Edge' | 'OpenAI' | 'Volcano',
    speed?: string,
    target?: 'original' | 'translate'
}

interface TTSPanelProps {
    settingStore?: SettingStore,
    getOptions?: (data: any) => void
    getService?: (service: "Edge" | "OpenAI" | "Volcano") => void;
    getSpeed?: (speed: string) => void
    getTarget?: (target: 'original' | 'translate') => void
    voiceOptions?: VoiceOptions
    getVoiceOptions?: (options: VoiceOptions) => void
    // voiceService?: 'Edge' | 'OpenAI' | 'Volcano'
    // voiceSpeed?: string
    // voiceTarget?: 'original' | 'translate'
    showButton?: boolean
}

const TTSPanel = inject('settingStore')(observer(({ settingStore, showButton, voiceOptions, getVoiceOptions, getOptions, getService, getSpeed, getTarget }: TTSPanelProps) => {

    const { settings } = settingStore!
    const [service, setService] = useState<'Edge' | 'OpenAI' | 'Volcano'>(voiceOptions?.service || 'Edge')
    const [curPlay, setCurPlay] = useState<any>();
    const [speed, setSpeed] = useState<string>(voiceOptions?.speed || '1')
    const [target, setTarget] = useState<'original' | 'translate'>(voiceOptions?.target || 'original')
    const [options, setOptions] = useState<TTSOptions>()
    const { t } = useTranslation()

    useEffect(() => {
        if (voiceOptions) {
            setOptions(voiceOptions.ttsOptions)
        }
    }, [voiceOptions])

    useEffect(() => {
        if (!showButton) {
            getOptions && getOptions(options)
        }
    }, [options, showButton, getOptions])

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

    const handleService = (e: 'Edge' | 'OpenAI' | 'Volcano') => {
        setService(e)
        if (!showButton) {
            getService && getService(e)
        }
    }
    const switchSpeed = (speed: string) => {
        setSpeed(speed)
        if (!showButton) {
            getSpeed && getSpeed(speed)
        }
    }

    const switchTarget = (target: 'original' | 'translate') => {
        setTarget(target)
        if (!showButton) {
            getTarget && getTarget(target)
        }
    }

    const addVoice = () => {
        // getService(service)
        // getSpeed(speed)
        // getTarget(target)
        // getOptions(options)
        getVoiceOptions && getVoiceOptions({ ttsOptions: options, service, speed, target })
    }

    return (
        <>
            <div className="mb-1 text-sm">{t('tts.provider')}</div>
            <Select defaultValue={service} onValueChange={handleService}>
                <SelectTrigger className=" w-auto min-w-36 mr-4">
                    <SelectValue placeholder={service} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value='OpenAI'>
                        Open AI {!settings.openAI?.apiKey && t('tts.unset')}
                    </SelectItem>
                    <SelectItem value='Edge'>
                        Edge
                    </SelectItem>
                    <SelectItem value='Volcano'>
                        Volcano {!settings.tts?.volctrans?.accessToken && t('tts.unset')}
                    </SelectItem>
                </SelectContent>
            </Select>
            {service === 'Edge' && <EdgeConfig options={voiceOptions?.service === 'Edge' ? options : undefined} setOptions={setOptions} getAudition={audition} />}
            {service === 'OpenAI' && <OpenAIConfig options={voiceOptions?.service === 'OpenAI' ? options : undefined} setOptions={setOptions} getAudition={audition} />}
            {service === 'Volcano' && <VolcanoConfig options={voiceOptions?.service === 'Volcano' ? options : undefined} setOptions={setOptions} getAudition={audition} />}
            <div className="relative mt-4 mb-2">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        {t('tts.other setting')}
                    </span>
                </div>
            </div>
            {
                service !== 'Volcano' &&
                <>
                    <div className="mb-1 text-sm">{t('tts.speed')}</div>
                    <Tabs value={speed}>
                        <TabsList className="grid w-full grid-cols-7">
                            <TabsTrigger className='px-1' value="0.5" onClick={() => switchSpeed('0.5')}>0.5</TabsTrigger>
                            <TabsTrigger className='px-1' value="0.75" onClick={() => switchSpeed('0.75')}>0.75</TabsTrigger>
                            <TabsTrigger className='px-1' value="1" onClick={() => switchSpeed('1')}>1</TabsTrigger>
                            <TabsTrigger className='px-1' value="1.5" onClick={() => switchSpeed('1.5')}>1.5</TabsTrigger>
                            <TabsTrigger className='px-1' value="2" onClick={() => switchSpeed('2')}>2</TabsTrigger>
                            <TabsTrigger className='px-1' value="3" onClick={() => switchSpeed('3')}>3</TabsTrigger>
                            <TabsTrigger className='px-1' value="4" onClick={() => switchSpeed('4')}>4</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </>
            }
            <div className="mb-1 text-sm mt-4">{t('tts.text')}</div>
            <Tabs value={target}>
                <TabsList className="grid grid-cols-2">
                    <TabsTrigger className='px-1' value="original" onClick={() => switchTarget('original')}>{t('tts.original text')}</TabsTrigger>
                    <TabsTrigger className='px-1' value="translate" onClick={() => switchTarget('translate')}>{t('tts.translate text')}</TabsTrigger>
                </TabsList>
            </Tabs>
            {showButton && <Button title={t('app.sure')} className="w-full mt-2" onClick={() => addVoice()}>
                <span>{t('app.sure')}</span>
            </Button>}


            {curPlay?.fileUrl && <audio id="auditionPlayer" controls>
                <source src={getLocalFileUrl(curPlay?.fileUrl)} type="audio/wav" />
            </audio>}
        </>
    )
}))

export default TTSPanel