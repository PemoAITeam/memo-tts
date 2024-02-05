import './tiptap.scss'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { EditorCard } from '../extensions/editor-card'
import { useEffect, useState } from 'react'
import { EventHandler } from '../extensions/paste-plugin'
import { TranslateCard } from '../extensions/translate-card'
import { generateUUID, mergeTranslate } from '@/lib/utils'
import { Button } from '../ui/button'
import { AiOutlineClear, AiOutlineLoading3Quarters } from 'react-icons/ai'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import TranslatePanel from './translate-panel'
import { TbArrowsDownUp } from 'react-icons/tb'
import { WhisperSegments } from '@/interface'
import { cloneDeep } from 'lodash-es'

interface TiptapProps {
    setEditor?: (editor: Editor) => void,
    content?: any,
}

const Tiptap = ({ setEditor, content }: TiptapProps) => {
    const [openTranslate, setOpenTranslate] = useState(false)
    const [translating, setTranslating] = useState<boolean>(false);
    
    const editor = useEditor({
        extensions: [
            StarterKit,
            EditorCard,
            TranslateCard,
            EventHandler,
        ],
        content: content || `<editor-card></editor-card>`,
        autofocus: true,
        enablePasteRules: false,
        onUpdate: (props) => {
            const jsonData = props.editor.getJSON();
            console.log(jsonData)
            const hasEditorCard = jsonData.content?.filter(item => item.type === 'editorCard')
            if (!hasEditorCard?.length) {
                props.editor.chain().insertContentAt(props.editor.state.selection.head, { type: 'editorCard', attrs: { id: generateUUID() } }).focus().run()
            }
        }
    })

    useEffect(() => {
        if (setEditor) {
            console.log(editor)
            setEditor(editor as Editor)
        }
    }, [editor, setEditor])

    useEffect(() => {
        if (content && editor) {
            editor?.commands.setContent({ type: 'doc', content: content })
        }
    }, [content, editor])

    const clear = () => {
        editor?.commands.clearContent();
        editor?.chain().insertContentAt(editor.state.selection.head, { type: 'editorCard' }).focus().run()
    }

    const getContent = () => {
        const jsonData = editor?.getJSON();
        const originalData = jsonData?.content?.filter(item => item.type === 'editorCard')
        const data = originalData?.map((item, index) => ({text: item.content ? item.content[0].text : '', index})).filter(item => !!item.text?.length)
        return data || []
    }

    const addTranslate = (translateData: WhisperSegments[]) => { 
        console.log(translateData)
        const jsonData = editor?.getJSON();
        const editorContent = cloneDeep(jsonData?.content);
        if(editorContent?.length) {
            const list = mergeTranslate(editorContent.filter(item => item.type === 'editorCard'), translateData).map(item => item.content && !item.content[0].text.length ? {type: item.type, attrs: item.attrs} : item)
            console.log(list)
            setTranslating(false)
            editor?.chain().setContent({ type: 'doc', content: list }).focus().run()
        }
    }

    return (
        <>
            <div className='flex items-center justify-end mb-2'>
                <Popover open={openTranslate} onOpenChange={(open) => setOpenTranslate(open)}>
                    <PopoverTrigger asChild>
                        <Button className="flex items-center relative p-0 cursor-pointer bg-transparent shadow-none h-auto hover:bg-transparent ml-4"> 
                            {translating ? <AiOutlineLoading3Quarters className='transition-colors ease-linear animate-spin mr-2' size={16} /> : <TbArrowsDownUp size={18} />}
                            <span className=" text-sm ml-1">翻译</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto">
                        <TranslatePanel startTranslate={setTranslating} getTranslateData={addTranslate} getContent={getContent} closePanel={() => setOpenTranslate(false)}  ></TranslatePanel>
                    </PopoverContent>
                </Popover>
                <Button className="flex items-center relative p-0 cursor-pointer bg-transparent shadow-none h-auto hover:bg-transparent ml-4" onClick={() => clear()}>
                    <AiOutlineClear size={18} />
                    <span className=" text-sm ml-1">清空</span>
                </Button>
            </div>
            <EditorContent editor={editor} />
        </>
    )
}

export default Tiptap