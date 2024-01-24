import { NodeViewContent, NodeViewProps, NodeViewWrapper } from "@tiptap/react";
// import { GoPlus } from "react-icons/go";
// import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from "../ui/menubar";
// import { Button } from "../ui/button";
// import { FiLink } from "react-icons/fi";


const EditorCardItem = ({ node }: NodeViewProps) => {
    return (
        <NodeViewWrapper className="editor-card-item mt-4">
            <div className="flex items-start">
                {/* <Menubar className="border-none shadow-none h-auto p-0">
                    <MenubarMenu>
                        <MenubarTrigger className="flex-shrink-0 p-0 border-none">
                            <GoPlus size={20} />
                        </MenubarTrigger>
                        <MenubarContent className=" min-w-0">
                            <MenubarItem className="flex items-center">
                                <Button className="p-0 bg-transparent shadow-none h-auto hover:bg-transparent mr-1">
                                    <FiLink size={18} />
                                </Button>
                                <span className=" text-sm">Parse link</span>
                            </MenubarItem>
                        </MenubarContent>
                    </MenubarMenu>
                </Menubar> */}
                <NodeViewContent className={`content flex-1 px-2 editable-content ${node.content.size == 0 ? 'is-empty' : ''}`} />
            </div>
        </NodeViewWrapper>
    );
};

export default EditorCardItem