import './tiptap.scss'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { EditorCard } from '../extensions/editor-card'
const Tiptap = () => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            EditorCard,
        ],
        content: `<editor-card></editor-card>`,
        autofocus: true
    })

    return (
        <>
            <EditorContent editor={editor} />
        </>
    )
}

export default Tiptap