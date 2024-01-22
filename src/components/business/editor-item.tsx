import { NodeViewContent, NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { GoPlus } from "react-icons/go";
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "../ui/menubar";
import { Button } from "../ui/button";
import { LuFilePlus } from "react-icons/lu";
import { FiLink } from "react-icons/fi";
import axios from 'axios';
import cheerio from 'cheerio';


const EditorCardItem = ({ node }: NodeViewProps) => {

    const handleFileSelect = async (event: { target: { files: any; }; }) => {
        const pdfFile = event.target.files[0];
        console.log(pdfFile)
    };

    return (
        <NodeViewWrapper className="editor-card-item mt-4">
            <div className="flex">
                <Menubar className="border-none shadow-none h-auto p-0">
                    <MenubarMenu>
                        <MenubarTrigger className="flex-shrink-0 p-0 border-none">
                            <GoPlus size={20} className="text-gray-500" />
                        </MenubarTrigger>
                        <MenubarContent className=" min-w-0">
                            <MenubarItem className="flex items-center">
                                <input type="file" onChange={handleFileSelect} className=" absolute w-full h-full opacity-0" accept=".pdf" />
                                <Button className="p-0 bg-transparent shadow-none h-auto text-gray-400 hover:bg-transparent mr-1">
                                    <LuFilePlus size={18} />
                                </Button>
                                <span className=" text-sm text-gray-400">Add File</span>
                            </MenubarItem>
                            <MenubarItem className="flex items-center">
                                <Button className="p-0 bg-transparent shadow-none h-auto text-gray-400 hover:bg-transparent mr-1">
                                    <FiLink size={18} />
                                </Button>
                                <span className=" text-sm text-gray-400">Parse link</span>
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>
                </Menubar>
                <NodeViewContent className={`content flex-1 px-2 editable-content text-gray-600 ${node.content.size == 0 ? 'is-empty' : ''}`} />
            </div>
        </NodeViewWrapper>
    );
};

export default EditorCardItem