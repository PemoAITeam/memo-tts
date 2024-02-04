import { ReactNodeViewRenderer, Node, mergeAttributes } from '@tiptap/react';
import TranslateItem from '../business/translate-item';
import { generateUUID } from '@/lib/utils';

export const TranslateCard = Node.create({
    name: 'translateCard',

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
                tag: 'translate-card',
            },
        ];
    },

    // addKeyboardShortcuts() {
    //     return {
    //         'Enter': () => {
    //             return this.editor.chain().insertContentAt(this.editor.state.selection.head, { type: 'editorCard' }).focus().run()
    //         },
    //         'Control-V': () => {
    //             navigator.clipboard.readText().then(text => {
    //                 this.editor.chain().insertContentAt(this.editor.state.selection.head, { type: this.type.name, content: [{type: 'text', text}] }).focus().run()
    //             })
    //             return true
    //         },
    //     }
    // },

    renderHTML({ HTMLAttributes }) {
        return ['react-component', mergeAttributes(HTMLAttributes), 0]
    },

    addNodeView() {
        return ReactNodeViewRenderer(TranslateItem)
    },
});