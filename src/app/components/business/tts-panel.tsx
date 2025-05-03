import { useCallback, useEffect, useRef, useState } from "react"
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
import PluginStore from "@/app/stores/pluginStore"
import { type AimForm, createExposedLayout, FormRenderer, type FormRendererHandle } from "memo-form-renderer";
export interface VoiceOptions {
    ttsOptions?: TTSOptions
    service?: 'Edge' | 'OpenAI' | 'Volcano',
    speed?: string,
    target?: 'original' | 'translate'
}

interface TTSPanelProps {
    settingStore?: SettingStore,
    pluginStore?: PluginStore,
    getOptions?: (data: any) => void
    onProviderChange?: (provider: string) => void;
    getSpeed?: (speed: string) => void
    getTarget?: (target: 'original' | 'translate') => void
    voiceOptions?: VoiceOptions
    getVoiceOptions?: (options: VoiceOptions) => void
    // voiceService?: 'Edge' | 'OpenAI' | 'Volcano'
    // voiceSpeed?: string
    // voiceTarget?: 'original' | 'translate'
    showConfirmButton?: boolean
}

const localPlugins = [{
    key: 'Edge',
    component: EdgeConfig
}, {
    key: 'OpenAI',
    component: OpenAIConfig
}, {
    key: 'Volcano',
    component: VolcanoConfig
}]

const TTSPanel = inject('settingStore', 'pluginStore')(observer(({ settingStore, pluginStore, showConfirmButton, voiceOptions, getVoiceOptions, getOptions, onProviderChange, getSpeed, getTarget }: TTSPanelProps) => {

    const { settings } = settingStore!
    const { memoPlugins } = pluginStore!

    const [curPlay, setCurPlay] = useState<any>();
    const [speed, setSpeed] = useState<string>(voiceOptions?.speed || '1')
    const [target, setTarget] = useState<'original' | 'translate'>(voiceOptions?.target || 'original')
    const [options, setOptions] = useState<TTSOptions>()
    const { t } = useTranslation()
    const [ttsProviders, setTtsProviders] = useState<any[]>([])
    const [provider, setProvider] = useState<string>('Edge')
    const [layout, setLayout] = useState<AimForm<Record<string, any>>>();
    const [showExposed, setShowExposed] = useState(false);

    const formRef = useRef<FormRendererHandle>(null);

    const usePlugin = useRef(true);
    // 从插件中过滤出 TTS 插件
    useEffect(() => {
        if (memoPlugins?.pluginProviders) {
            setTtsProviders((memoPlugins?.pluginProviders || []).filter(item => item.type === "tts"));
        }
    }, [memoPlugins?.pluginProviders])

    // 如果有 TTS 插件提供 providers，保证默认选中一个 provider
    useEffect(() => {
        if (ttsProviders.length > 0 && provider === "" && usePlugin.current) {
            setProvider(ttsProviders[0].value);
        }
    }, [provider, ttsProviders])

    useEffect(() => {
        if (voiceOptions) {
            setOptions(voiceOptions.ttsOptions)
        }
    }, [voiceOptions])

    useEffect(() => {
        if (!showConfirmButton) {
            getOptions?.(options)
        }
    }, [options, showConfirmButton, getOptions])

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
        const fileUrl = await window.AIM.tts.getTemoAudition(params, uuid);
        if (fileUrl) {
            playAudio({ fileUrl }, true)
        }
    }

    const switchSpeed = (speed: string) => {
        setSpeed(speed)
        if (!showConfirmButton) {
            getSpeed && getSpeed(speed)
        }
    }

    const switchTarget = (target: 'original' | 'translate') => {
        setTarget(target)
        if (!showConfirmButton) {
            getTarget && getTarget(target)
        }
    }

    const addVoice = () => {
        // onProviderChange(service)
        // getSpeed(speed)
        // getTarget(target)
        // getOptions(options)
        getVoiceOptions && getVoiceOptions({ ttsOptions: options, service: provider, speed, target })
    }

    const currentTTSProviders = ttsProviders.find(item => item.value === provider);

    const handleSelectOpenChange = (value: boolean) => {
    };

    // 当表单变更时，判断当前插件的是否必填项已经填写，控制能否提交TTS
    const handlePluginConfigChange = useCallback((data: Record<string, any>) => {
        console.log(data)
        setOptions(data)
    }, [])

    useEffect(() => {
        if (memoPlugins) {
            console.log(memoPlugins);

            const { installedPluginsManifests, pluginsConfigurations, localPlugins: { versions } } = memoPlugins;
            if (currentTTSProviders && currentTTSProviders.pluginId) {
                const version = versions[currentTTSProviders.pluginId];
                const manifest = installedPluginsManifests[currentTTSProviders.pluginId];
                const pluginConfig = pluginsConfigurations[`${currentTTSProviders.pluginId}@${version}`] || {};
                const plugin = memoPlugins?.installedPlugins[`${currentTTSProviders.pluginId}`];
                if (manifest?.configurationExposed?.length) {
                    setLayout(createExposedLayout(manifest, pluginConfig, currentTTSProviders.pluginId, plugin?.file));
                    setShowExposed(true);
                    // TODO: 检查必填项

                    return;
                }
            }
            setLayout(undefined);
            // setRequiredConfig(false);
            setShowExposed(false);
        }
    }, [currentTTSProviders, memoPlugins]);

    const handleProviderChange = useCallback((value: string) => {
        setProvider(value);
        !showConfirmButton && onProviderChange?.(value)
    }, [onProviderChange, showConfirmButton]);

    return (
        <>
            <div className="mb-1 text-sm">{t('tts.provider')}</div>
            <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="TTS provider" />
                </SelectTrigger>
                <SelectContent>
                    {
                        usePlugin.current && ttsProviders.map(option => <SelectItem disabled={option.disabled} key={option.value} value={option.value}>{t((option.pluginId ? (option.pluginId + ".") : "") + option.label)}</SelectItem>)
                    }
                    {/* <Button size={"sm"} variant={"ghost"} className='w-full' key={"view"}>{t("translate.view plugins")}</Button> */}
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
            {
                usePlugin.current && showExposed && <div>
                    {layout && <FormRenderer onOpenChange={handleSelectOpenChange} className='pb-2' ref={formRef} onDataReady={handlePluginConfigChange} onChange={handlePluginConfigChange} layout={layout} />}
                </div>
            }
            {
                localPlugins.map((item) => provider === item.key && <item.component
                    key={item.key}
                    options={voiceOptions?.service === item.key ? options : undefined}
                    setOptions={setOptions}
                    getAudition={audition}
                />)
            }
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
                provider !== 'Volcano' &&
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
            {showConfirmButton && <Button title={t('app.sure')} className="w-full mt-2" onClick={() => addVoice()}>
                <span>{t('app.sure')}</span>
            </Button>}


            {curPlay?.fileUrl && <audio id="auditionPlayer" controls>
                <source src={getLocalFileUrl(curPlay?.fileUrl)} type="audio/wav" />
            </audio>}
        </>
    )
}))

export default TTSPanel