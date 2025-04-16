import { NodeViewContent, NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { TbArrowsDownUp, TbMicrophone, TbPlus, TbX } from "react-icons/tb";
import { DropdownMenu, DropdownMenuContent, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { generateUUID, getLocalFileUrl, getSpeed } from "@/app/lib/utils";
import TranslatePanel from "./translate-panel";
import { cloneDeep } from 'lodash-es';
import { WhisperSegments } from "@/app/interface";
import { Button } from "../ui/button";
import TTSPanel, { VoiceOptions } from "./tts-panel";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useTranslation } from "react-i18next";
import { SlPicture } from "react-icons/sl";
import { inject, observer } from "mobx-react";
import DataStore from "@/app/stores/dataStore";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import TTSDialog from "./tts-dialog";
import { HiOutlineTrash } from "react-icons/hi2";

interface EditorCardProps extends NodeViewProps {
    dataStore?: DataStore
}

// 哈希函数，将字符串转换为一个颜色
function hashStringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `#${((hash >> 24) & 0xFF).toString(16).padStart(2, '0')}${((hash >> 16) & 0xFF).toString(16).padStart(2, '0')}${((hash >> 8) & 0xFF).toString(16).padStart(2, '0')}`;
    return color;
}

// 生成对比度较高的背景颜色
function getContrastingColor(color: string): string {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#FFFFFF';
}

const EditorCardItem = inject('dataStore')(observer(({ node, editor, dataStore }: EditorCardProps) => {

    const { t } = useTranslation()
    // const [service, setService] = useState<'Edge' | 'OpenAI' | 'Volcano'>('Edge')
    // const [options, setOptions] = useState<TTSOptions>()
    // const [curOptions, setCurOptions] = useState<VoiceOptions>()
    // const [speed, setSpeed] = useState<string>('1')
    // const [target, setTarget] = useState<'original' | 'translate'>('original')
    const [voice, setVoice] = useState<string>(node.attrs.voice ? `${node.attrs.voice?.voiceLocalName}(${!node.attrs.voice?.target || node.attrs.voice?.target === 'original' ? t('tts.original text') : t('tts.translate text')}-${node.attrs.voice?.speed || 1})` : '')
    const [hasPic, setHasPic] = useState<boolean>(!!node.attrs.picture)
    const [openTTS, setOpenTTS] = useState(false)
    const [openMenu, setOpenMenu] = useState(false)
    const [selectedImage, setSelectedImage] = useState(node.attrs.picture ? node.attrs.picture.path : null);
    const [openDialog, setOpenDialog] = useState(false);

    useEffect(() => {
        setHasPic(dataStore?.TTSType === 'video')
        console.log(dataStore?.TTSType)
    }, [dataStore?.TTSType])

    useEffect(() => {
        setSelectedImage(node.attrs.picture ? node.attrs.picture.path : null)
        if (node.attrs.voice) {
            // setCurOptions(node.attrs.voice.ttsOptions)
            // setOptions(node.attrs.voice.ttsOptions.ttsOptions)
        }
    }, [node.attrs])

    const selectBgPic = async (filePath: string) => {
        dataStore!.copyLibraryFile(filePath, 'pic')
        setSelectedImage(filePath)
        setOpenDialog(false)
        const jsonData = editor.getJSON();
        if (jsonData.content) {
            const curItem = jsonData.content?.find(item => item.attrs?.id == node.attrs.id && item.type === "editorCard")
            if (curItem && curItem.attrs) {
                curItem.attrs.picture = {
                    path: filePath
                }
                editor.chain().setContent(jsonData, true).focus().run()
            }
        }

    }

    const addTranslate = (translateData: WhisperSegments[]) => {
        const jsonData = editor.getJSON();
        if (jsonData.content) {
            const index = jsonData.content?.findIndex(item => item.attrs?.id == node.attrs.id)
            if (index > -1) {
                if (jsonData.content[index + 1]?.type === 'translateCard') {
                    jsonData.content[index + 1].content = [{ type: 'text', text: translateData[0].text }];
                    editor.chain().setContent({ type: 'doc', content: cloneDeep(jsonData.content) }, true).focus().run()
                } else {
                    const list = [...jsonData.content.slice(0, index + 1), { type: 'translateCard', attrs: { id: generateUUID() }, content: [{ type: 'text', text: translateData[0].text }] }, ...jsonData.content.slice(index + 1)];
                    console.log(list)
                    editor.chain().setContent({ type: 'doc', content: list }, true).focus().run()
                }
            }
        }
    }

    const getContent = () => {
        return [{ text: node.content.toJSON()[0].text }]
    }

    const addVoice = (data: VoiceOptions) => {
        const jsonData = editor.getJSON();
        if (jsonData.content) {
            const curItem = jsonData.content?.find(item => item.attrs?.id == node.attrs.id && item.type === "editorCard")
            if (curItem && curItem.attrs) {
                console.log(curItem)
                const { speed, target, service, ttsOptions } = data;
                if (service === 'Edge') {
                    const rate = getSpeed(speed!);
                    curItem.attrs.voice = {
                        type: 'Edge',
                        lang: ttsOptions?.lang,
                        rate,
                        pitch: 0,
                        voiceName: ttsOptions?.voice?.shortName,
                        voiceLocalName: ttsOptions?.voice?.properties.LocalName,
                        target,
                        ttsOptions: data,
                    }
                } else if (service === 'OpenAI') {
                    curItem.attrs.voice = {
                        type: 'OpenAI',
                        model: ttsOptions?.model,
                        speed: speed,
                        voice: ttsOptions?.voice?.value,
                        voiceLocalName: ttsOptions?.voice?.label,
                        target,
                        ttsOptions: data,
                    }
                } else if (service === 'Volcano') {
                    curItem.attrs.voice = {
                        type: 'Volc',
                        emotion: ttsOptions?.emotion,
                        voice_type: ttsOptions?.voice?.value,
                        voiceLocalName: ttsOptions?.voice?.label,
                        scene: ttsOptions?.scenes,
                        target,
                        ttsOptions: data,
                    }
                }
                // setCurOptions(data)
                setVoice(`${curItem.attrs.voice.voiceLocalName}(${target === 'original' ? t('tts.original text') : t('tts.translate text')}-${speed})`)
                editor.chain().setContent(jsonData, true).focus().run()
                setOpenMenu(false)
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
            editor.chain().setContent(jsonData, true).focus().run()
        }
    }

    const deletePic = (event: any) => {
        if (event) {
            event.stopPropagation();
        }
        setSelectedImage(null)
        const jsonData = editor.getJSON();
        if (jsonData.content) {
            const curItem = jsonData.content?.find(item => item.attrs?.id == node.attrs.id && item.type === "editorCard")
            if (curItem && curItem.attrs) {
                curItem.attrs.picture = null
                editor.chain().setContent(jsonData, true).focus().run()
            }
        }
    }

    const textColor = hashStringToColor(voice);
    const backgroundColor = getContrastingColor(textColor);

    return (
        <NodeViewWrapper className="editor-card-item">
            {voice && <div className=" pl-7 mt-4 voice-item">
                <Popover open={openTTS} onOpenChange={(open: boolean) => setOpenTTS(open)}>
                    <PopoverTrigger asChild>
                        <Button
                            variant={'ghost'}
                            size={"sm"}
                            style={{ color: backgroundColor, backgroundColor: textColor }}
                            className="group relative h-6 px-2 bg-accent text-accent-foreground"
                        >
                            <TbMicrophone />
                            {voice}
                            <Button
                                size={"icon"}
                                className="absolute top-0 -right-7 w-6 h-6 group-hover:opacity-100 opacity-0 transform-gpu duration-200 transition-opacity"
                                onClick={deleteVoice}
                                variant={"destructive"}
                            >
                                <TbX size={10} />
                            </Button>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent side="right" sideOffset={10} className="w-auto editor-card-tts">
                        <TTSPanel getVoiceOptions={addVoice} showConfirmButton />
                        {/* <TTSPanel getOptions={setOptions} getSpeed={setSpeed} getTarget={setTarget} onProviderChange={setService}></TTSPanel>
                        <Button className="w-full mt-2" onClick={addVoice}>
                            <span>{t('app.sure')}</span>
                        </Button> */}
                    </PopoverContent>
                </Popover>
            </div>}

            <div className="flex items-start">
                <DropdownMenu open={openMenu} onOpenChange={setOpenMenu}>
                    <DropdownMenuTrigger title={t('app.option')} className='flex-shrink-0 p-0 border-none'>
                        <TbPlus size='20' />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <TbMicrophone className="mr-2" size={16} /> {t('app.add voice')}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent className=" p-3 editor-card-tts">
                                    <TTSPanel getVoiceOptions={addVoice} showConfirmButton />
                                    {/* <Button className="w-full mt-2" onClick={addVoice}>
                                        <span>{t('app.sure')}</span>
                                    </Button> */}
                                </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger disabled={node.content.size == 0} className={`${node.content.size == 0 ? 'text-gray-500' : ''}`}>
                                <TbArrowsDownUp className="mr-2" size={16} /> {t('app.translate')}
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
                <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogTrigger asChild>
                        {hasPic &&
                            <div className="text-gray-400 flex-shrink-0 cursor-pointer w-12 h-12">
                                {!selectedImage && <SlPicture size={48} />}
                                {selectedImage && <div className=" relative w-full h-full editor-pic-item overflow-hidden">
                                    <Button title={t('history.delete')} variant={'ghost'} className='delete-button hidden absolute right-0 top-0 cursor-pointer shadow-none h-auto text-sm' onClick={(e) => deletePic(e)}>
                                        <HiOutlineTrash size={12} />
                                    </Button>
                                    <img className="cover w-full h-full object-cover" src={getLocalFileUrl(selectedImage)} alt={t('tts.select img')} />
                                </div>}
                            </div>
                        }
                    </DialogTrigger>
                    <DialogContent className="pic-dialog w-2/3 h-2/3 max-w-none">
                        <TTSDialog selectImage={selectBgPic} fileType="pic"></TTSDialog>
                    </DialogContent>
                </Dialog>
            </div>
        </NodeViewWrapper>
    );
}));

export default EditorCardItem