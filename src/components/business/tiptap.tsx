import './tiptap.scss'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { EditorCard } from '../extensions/editor-card'
import { useEffect } from 'react'

interface TiptapProps {
    setEditor?: (editor: Editor) => void
}

const Tiptap = ({ setEditor }: TiptapProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            EditorCard,
        ],
        content: `<editor-card></editor-card>`,
        autofocus: true
    })

    useEffect(() => {
        if (setEditor) {
            console.log(editor)
            setEditor(editor as Editor)
        }
    }, [editor, setEditor])

    return (
        <>
            <EditorContent editor={editor} />
        </>
    )
}

export default Tiptap