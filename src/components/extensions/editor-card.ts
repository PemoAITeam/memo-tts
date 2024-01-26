import { ReactNodeViewRenderer, Node, mergeAttributes } from '@tiptap/react';
import EditorCardItem from '../business/editor-item';

declare module '@tiptap/react' {
    interface Commands<ReturnType> {
        editorCard: {
            insertEditorCard: () => ReturnType;
        };
    }
}

export const EditorCard = Node.create({
    name: 'editorCard',

    group: 'block',

    content: 'inline*',

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
                return this.editor.chain().insertContentAt(this.editor.state.selection.head, { type: this.type.name }).focus().run()
            },
            'Control-V': () => {
                navigator.clipboard.readText().then(text => {
                    this.editor.chain().insertContentAt(this.editor.state.selection.head, { type: this.type.name, content: [{type: 'text', text}] }).focus().run()
                })
                return true
            },
            // 'Control-Shift-V': () => {
            //     navigator.clipboard.readText().then(text => {
            //         console.log(text + '11')
            //         this.editor.chain().insertContentAt(this.editor.state.selection.head, text).focus().run()
            //     })
            //     return true
            // }
        }
    },

    renderHTML({ HTMLAttributes }) {
        return ['react-component', mergeAttributes(HTMLAttributes), 0]
    },

    addNodeView() {
        return ReactNodeViewRenderer(EditorCardItem)
    },
});