import './tiptap.scss'
import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { EditorCard } from '../extensions/editor-card'
import { useEffect } from 'react'
import { EventHandler } from '../extensions/paste-plugin'

interface TiptapProps {
    setEditor?: (editor: Editor) => void
}

const Tiptap = ({ setEditor }: TiptapProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            EditorCard,
            EventHandler,
        ],
        content: `<editor-card></editor-card>`,
        autofocus: true,
        enablePasteRules: false,
        onUpdate: (props) => {
            const jsonData = props.editor.getJSON();
            const hasEditorCard = jsonData.content?.filter(item => item.type === 'editorCard')
            if (!hasEditorCard?.length) {
                props.editor.chain().insertContentAt(props.editor.state.selection.head, { type: 'editorCard' }).focus().run()
            }
        }
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