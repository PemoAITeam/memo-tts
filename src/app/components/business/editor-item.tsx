import { NodeViewContent, NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { GoPlus } from "react-icons/go";
import { MdOutlineKeyboardVoice } from "react-icons/md";
import { TbArrowsDownUp } from "react-icons/tb";
import { DropdownMenu, DropdownMenuContent, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { generateUUID, getSpeed } from "@/app/lib/utils";
import TranslatePanel from "./translate-panel";
import { cloneDeep } from 'lodash-es';
import { WhisperSegments } from "@/app/interface";
import { Button } from "../ui/button";
import TTSPanel from "./tts-panel";
import { useState } from "react";
import { TTSOptions } from "@/app/lib/tts";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { IoIosClose } from "react-icons/io";
import { useTranslation } from "react-i18next";

const EditorCardItem = ({ node, editor }: NodeViewProps) => {

    const { t } = useTranslation()
    const [service, setService] = useState<'Edge' | 'OpenAI' | 'Volcano'>('Edge')
    const [options, setOptions] = useState<TTSOptions>()
    const [speed, setSpeed] = useState<string>('1')
    const [target, setTarget] = useState<'original' | 'translate'>('original')
    const [voice, setVoice] = useState<string>(node.attrs.voice ? `${node.attrs.voice?.voiceLocalName}(${!node.attrs.voice?.target || node.attrs.voice?.target === 'original' ? t('tts.original text') : t('tts.translate text')}-${node.attrs.voice?.speed || 1})` : '')
    const [openTTS, setOpenTTS] = useState(false)
    const addTranslate = (translateData: WhisperSegments[]) => {
        const jsonData = editor.getJSON();
        if (jsonData.content) {
            const index = jsonData.content?.findIndex(item => item.attrs?.id == node.attrs.id)
            if (index > -1) {
                if (jsonData.content[index + 1]?.type === 'translateCard') {
                    jsonData.content[index + 1].content = [{ type: 'text', text: translateData[0].text }];
                    editor.chain().setContent({ type: 'doc', content: cloneDeep(jsonData.content) }).focus().run()
                } else {
                    const list = [...jsonData.content.slice(0, index + 1), { type: 'translateCard', attrs: { id: generateUUID() }, content: [{ type: 'text', text: translateData[0].text }] }, ...jsonData.content.slice(index + 1)];
                    console.log(list)
                    editor.chain().setContent({ type: 'doc', content: list }).focus().run()
                }
            }
        }
    }

    const getContent = () => {
        return [{ text: node.content.toJSON()[0].text }]
    }

    const addVoice = () => {
        console.log(options, service)
        const jsonData = editor.getJSON();
        if (jsonData.content) {
            const curItem = jsonData.content?.find(item => item.attrs?.id == node.attrs.id && item.type === "editorCard")
            if (curItem && curItem.attrs) {
                console.log(curItem)
                if (service === 'Edge') {
                    const rate = getSpeed(speed);
                    curItem.attrs.voice = {
                        type: 'Edge',
                        lang: options?.lang,
                        rate,
                        pitch: 0,
                        voiceName: options?.voice?.shortName,
                        voiceLocalName: options?.voice?.properties.LocalName,
                        target,
                    }
                } else if (service === 'OpenAI') {
                    curItem.attrs.voice = {
                        type: 'OpenAI',
                        model: options?.model,
                        speed: speed,
                        voice: options?.voice?.value,
                        voiceLocalName: options?.voice?.label,
                        target,
                    }
                } else if (service === 'Volcano') {
                    curItem.attrs.voice = {
                        type: 'Volc',
                        emotion: options?.emotion,
                        voice_type: options?.voice?.value,
                        voiceLocalName: options?.voice?.label,
                        scene: options?.scenes,
                        target,
                    }
                }

                setVoice(`${curItem.attrs.voice.voiceLocalName}(${target === 'original' ? t('tts.original text') : t('tts.translate text')}-${speed})`)
                editor.chain().setContent(jsonData).focus().run()
            }
        }
    }

    const deleteVoice = (event: any) => {
        if (event) {
            event.stopPropagation();
        }
        const jsonData = editor.getJSON();
        const curItem = jsonData.content?.find(item => item.attrs?.id == node.attrs.id && item.type === "editorCard")
        if (curItem?.attrs) {
            curItem.attrs.voice = null;
            setVoice("")
            editor.chain().setContent(jsonData).focus().run()
        }
    }

    return (
        <NodeViewWrapper className="editor-card-item">
            {voice && <div className=" pl-7 mt-4 voice-item">
                <Popover open={openTTS} onOpenChange={(open: boolean) => setOpenTTS(open)}>
                    <PopoverTrigger asChild>
                        <Button variant={'ghost'} className=" relative editor-voice p-0 pr-2 h-5 mb-1  bg-accent text-accent-foreground">
                            <MdOutlineKeyboardVoice size={18} />
                            <span style={{ fontSize: '12px' }}>{voice}</span>
                            <IoIosClose size={16} className=" absolute -top-1 -right-1" onClick={deleteVoice} />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent side="right" sideOffset={10} className="w-auto editor-card-tts">
                        <TTSPanel setOptions={setOptions} getSpeed={setSpeed} getTarget={setTarget} getService={setService}></TTSPanel>
                        <Button className="w-full mt-2" onClick={addVoice}>
                            <span>{t('app.sure')}</span>
                        </Button>
                    </PopoverContent>
                </Popover>
            </div>}

            <div className="flex items-start">
                <DropdownMenu>
                    <DropdownMenuTrigger title={t('app.option')} className='flex-shrink-0 p-0 border-none'>
                        <GoPlus size='20' />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <MdOutlineKeyboardVoice className="mr-2" size={16} />
                                <span className=" text-sm">{t('app.add voice')}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent className=" p-3 editor-card-tts">
                                    <TTSPanel setOptions={setOptions} getSpeed={setSpeed} getTarget={setTarget} getService={setService}></TTSPanel>
                                    <Button className="w-full mt-2" onClick={addVoice}>
                                        <span>{t('app.sure')}</span>
                                    </Button>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger disabled={node.content.size == 0} className={`${node.content.size == 0 ? 'text-gray-500' : ''}`}>
                                <TbArrowsDownUp className="mr-2" size={16} />
                                <span className=" text-sm">{t('app.translate')}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent className=" p-3">
                                    <TranslatePanel getTranslateData={addTranslate} getContent={getContent}></TranslatePanel>
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                    </DropdownMenuContent>
                </DropdownMenu>
                <NodeViewContent className={`content flex-1 px-2 editable-content ${node.content.size == 0 ? 'is-empty' : ''}`} />
            </div>
        </NodeViewWrapper>
    );
};

export default EditorCardItem