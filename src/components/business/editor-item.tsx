import { NodeViewContent, NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { GoPlus } from "react-icons/go";
import { MdOutlineKeyboardVoice } from "react-icons/md";
import { TbArrowsDownUp } from "react-icons/tb";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { generateUUID } from "@/lib/utils";
import TranslatePanel from "./translate-panel";
import { cloneDeep } from 'lodash-es';
import { WhisperSegments } from "@/interface";

const EditorCardItem = ({ node, editor }: NodeViewProps) => {
    
    const addTranslate = (translateData: WhisperSegments[]) => {
        const jsonData = editor.getJSON();
        if (jsonData.content) {
            const index = jsonData.content?.findIndex(item => item.attrs?.id == node.attrs.id)
            if (index > -1) {
                if(jsonData.content[index + 1].type === 'translateCard') {
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
        return [{text: node.content.toJSON()[0].text}]
    }

    return (
        <NodeViewWrapper className="editor-card-item">
            <div className="flex items-start">
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