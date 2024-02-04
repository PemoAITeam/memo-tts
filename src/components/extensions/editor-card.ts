import { ReactNodeViewRenderer, Node, mergeAttributes } from '@tiptap/react';
import EditorCardItem from '../business/editor-item';
import { generateUUID } from '@/lib/utils';

// declare module '@tiptap/react' {
//     interface Commands<ReturnType> {
//         editorCard: {
//             insertEditorCard: () => ReturnType;
//         };
//     }
// }

export const EditorCard = Node.create({
    name: 'editorCard',

    group: 'block',

    content: 'inline*',

    addAttributes() {
        return {
            id: {
                default: generateUUID(),
                rendered: false,
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'editor-card',
            },
        ];
    },

    addKeyboardShortcuts() {
        return {
            'Enter': () => {
                console.log(this.editor.state.toJSON())
                return this.editor.chain().insertContentAt(this.editor.state.selection.head, { type: this.type.name, attrs: {id: generateUUID()} }).focus().run()
            },
            'Control-V': () => {
                navigator.clipboard.readText().then(text => {
                    this.editor.chain().insertContentAt(this.editor.state.selection.head, { type: this.type.name, content: [{type: 'text', text}] }).focus().run()
                })
                return true
            },
        }
    },

    renderHTML({ HTMLAttributes }) {
        return ['react-component', mergeAttributes(HTMLAttributes), 0]
    },

    addNodeView() {
        return ReactNodeViewRenderer(EditorCardItem)
    },
});