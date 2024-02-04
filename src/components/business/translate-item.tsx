import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { Button } from "../ui/button";
import { RiTranslate } from "react-icons/ri";
import { useState } from "react";



const TranslateItem = () => {
    const [show, setShow] = useState(true)

    const handlerTranslate = () => {
        setShow(!show)
    }
    return (
        <NodeViewWrapper className="translate-card-item">
            <div className={`flex items-start mt-4} ${!show ? 'is-none': ''}`}>
                <Button onClick={handlerTranslate} className=" text-gray-500 flex-shrink-0 p-0 border-none bg-transparent h-auto shadow-none hover:bg-transparent">
                    <RiTranslate size={20} />
                </Button>
                <NodeViewContent className={`content flex-1 px-2 editable-content`} />
            </div>
        </NodeViewWrapper>
    );
};

export default TranslateItem