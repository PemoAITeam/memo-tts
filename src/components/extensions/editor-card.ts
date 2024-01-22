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
        }
    },

    renderHTML({ HTMLAttributes }) {
        return ['react-component', mergeAttributes(HTMLAttributes), 0]
    },

    addNodeView() {
        return ReactNodeViewRenderer(EditorCardItem)
    },
});