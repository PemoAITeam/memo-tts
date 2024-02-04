import { NodeViewContent, NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { GoPlus } from "react-icons/go";
import { MdOutlineKeyboardVoice } from "react-icons/md";
import { TbArrowsDownUp } from "react-icons/tb";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { generateUUID } from "@/lib/utils";
import TranslatePanel from "./translate-panel";

const EditorCardItem = ({ node, editor }: NodeViewProps) => {
    
    const addTranslate = (translateData: string) => {
        const jsonData = editor.getJSON();
        if (jsonData.content) {
            const index = jsonData.content?.findIndex(item => item.attrs?.id == node.attrs.id)
            if (index > -1) {
                const list = [...jsonData.content.slice(0, index + 1), { type: 'translateCard', attrs: { id: generateUUID() }, content: [{ type: 'text', text: translateData }] }, ...jsonData.content.slice(index + 1)];
                console.log(list)
                editor.chain().setContent({ type: 'doc', content: list }).focus().run()
            }
        }
    }

    const getContent = () => {
        return [{text: node.content.toJSON()[0].text}]
    }

    return (
        <NodeViewWrapper className="editor-card-item">
            <div className="flex items-start">
                {/* <Menubar className="border-none shadow-none h-auto p-0">
                    <MenubarMenu>
                        <MenubarTrigger className="flex-shrink-0 p-0 border-none">
                            <GoPlus size={20} />
                        </MenubarTrigger>
                        <MenubarContent className=" min-w-0">
                            <MenubarItem className="flex items-center">
                                <Button className="p-0 bg-transparent shadow-none h-auto hover:bg-transparent mr-1">
                                    <MdOutlineKeyboardVoice size={18} />
                                </Button>
                                <span className=" text-sm">Add Voice</span>
                            </MenubarItem>
                            <MenubarItem className="flex items-center" onClick={addTranslate}>
                                <Button className="p-0 bg-transparent shadow-none h-auto hover:bg-transparent mr-1">
                                    <TbArrowsDownUp size={16} />
                                </Button>
                                <span className=" text-sm">Translate</span>
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>
                </Menubar> */}
                <DropdownMenu>
                    <DropdownMenuTrigger title='选项' className='flex-shrink-0 p-0 border-none'>
                        <GoPlus size='20' />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem>
                            <MdOutlineKeyboardVoice className="mr-2" size={18} />
                            <span className=" text-sm">Add Voice</span>
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger disabled={node.content.size == 0} className={`${node.content.size == 0 ? 'text-gray-500' : ''}`}>
                                <TbArrowsDownUp className="mr-2" size={16} />
                                <span className=" text-sm">Translate</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent className=" p-3">
                                    {/* <div className="flex items-center mb-3">
                                        <div className=" mr-3">服务</div>
                                        <Select onValueChange={switchProvider}>
                                            <SelectTrigger className=" w-auto min-w-36 mr-4">
                                                <SelectValue placeholder={provider.label} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <ScrollArea className="h-[200px]">
                                                    {providerList.map(provider => (
                                                        <SelectItem key={provider.value} value={provider.value}>
                                                            {provider.label}
                                                        </SelectItem>
                                                    ))}
                                                </ScrollArea>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center mb-3">
                                        <div className=" mr-3">语言</div>
                                        <Select onValueChange={switchLang}>
                                            <SelectTrigger className=" w-auto min-w-36 mr-4">
                                                <SelectValue placeholder={lang.label} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <ScrollArea className="h-[300px]">
                                                    {langs && langs.map(lang => (
                                                        <SelectItem key={lang.value} value={lang.value}>
                                                            {lang.label}
                                                        </SelectItem>
                                                    ))}
                                                </ScrollArea>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button className="w-full" onClick={addTranslate}>翻译</Button> */}
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